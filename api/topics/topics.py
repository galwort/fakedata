from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from datetime import datetime, timezone
from firebase_admin import credentials, firestore
from json import loads, dumps
from openai import OpenAI
from requests import get
import firebase_admin
import re

vault_url = "https://kv-galwort.vault.azure.net/"
credential = DefaultAzureCredential()
secret_client = SecretClient(vault_url=vault_url, credential=credential)

client = OpenAI(api_key=secret_client.get_secret("OAIKey").value)

firestore_sdk = secret_client.get_secret("FirebaseSDK").value
cred = credentials.Certificate(loads(firestore_sdk))
try:
    firebase_admin.get_app()
except ValueError:
    firebase_admin.initialize_app(cred)
db = firestore.client()

news_key = secret_client.get_secret("NewsAPIKey").value

TOPIC_STYLE_GUIDE = (
    "A topic must be a clean canonical label: a reusable subject someone could "
    "browse or compare over time. Good examples: 'baseball', 'dreams', "
    "'climate change', 'artificial intelligence'. Bad examples: article "
    "headlines, full claims, essay titles, research questions, or explanatory "
    "phrases like 'the importance of ...'. Multi-word topics must include spaces between the words; never concatenate them. "
    "Prefer one or two words; use three or four only when that is the natural name of the subject."
)


def normalize_topic(topic):
    topic = topic.strip().lower()
    topic = re.sub(r"[^a-z0-9]+", "-", topic)
    return re.sub(r"-+", "-", topic).strip("-")


def normalize_generated_topics(topics, limit):
    normalized_topics = []
    seen = set()

    for topic in topics:
        normalized_topic = normalize_topic(str(topic))
        if not normalized_topic or normalized_topic in seen:
            continue

        seen.add(normalized_topic)
        normalized_topics.append(normalized_topic)
        if len(normalized_topics) == limit:
            break

    return normalized_topics


def gen_topics_from_topics(model, num_topics=3):
    topics_ref = db.collection("topics")
    topics = [doc.id for doc in topics_ref.stream()]
    num_candidates = max(num_topics * 4, 12)

    system_message = (
        f"You are tasked to generate {num_candidates} candidate topics "
        "given a list of existing topics. "
        f"{TOPIC_STYLE_GUIDE} "
        "Silently discard any candidate that does not meet this standard. "
        "Reply in JSON format with the key 'new_topics' "
        "and an array of new topics."
    )
    user_message = {
        "role": "user",
        "content": dumps({"topics": topics, "num_topics": num_candidates}),
    }

    messages = [{"role": "system", "content": system_message}, user_message]
    response = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=messages,
    )

    json_response = loads(response.choices[0].message.content)
    return normalize_generated_topics(json_response["new_topics"], num_topics)


def get_news_topics():
    news_url = f"https://newsapi.org/v2/top-headlines?country=us&apiKey={news_key}"
    response = get(news_url)
    news = response.json()
    topics = ""
    for topic in [article["title"] for article in news["articles"]]:
        if "[Removed]" in topic:
            continue

        last_hyphen = topic.rfind(" - ")
        if last_hyphen != -1:
            topic = topic[:last_hyphen]

        topics += topic + "\n"
    topics = topics.rstrip("\n")

    return topics


def gen_topics_from_news(model, num_topics=3):
    num_candidates = max(num_topics * 4, 12)
    system_message = (
        f"You are tasked to generate {num_candidates} candidate topics "
        "given a list of news articles. These topics should cover "
        "a wide range of areas and be relevant to various fields "
        "over time, and not just relevant to today. They should be "
        "universally relevant and timeless. "
        f"{TOPIC_STYLE_GUIDE} "
        "Extract the underlying subject, not the article headline. "
        "Silently discard any candidate that does not meet this standard. "
        "Reply in JSON format with the key 'new_topics' "
        "and an array of new topics."
    )
    user_message = {
        "role": "user",
        "content": get_news_topics(),
    }

    messages = [{"role": "system", "content": system_message}, user_message]
    response = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=messages,
    )

    json_response = loads(response.choices[0].message.content)
    return normalize_generated_topics(json_response["new_topics"], num_topics)


def update_firestore(topic):
    topic = normalize_topic(topic)
    if not topic:
        return False

    topic_ref = db.collection("topics").document(topic)
    topic_doc = topic_ref.get()

    current_time = datetime.now(timezone.utc)

    if topic_doc.exists:
        print(f"Topic '{topic}' already exists in Firestore. Ignoring.")
        return False

    topic_data = {
        "insert_time": current_time,
        "modified_time": current_time,
        "runs": 0,
    }

    topic_ref.set(topic_data)
    print(f"Topic '{topic}' has been added to Firestore.")
    return True


def main():
    model = "gpt-4o"

    new_topics = gen_topics_from_topics(model)
    for topic in new_topics:
        update_firestore(topic)

    news_topics = gen_topics_from_news(model)
    for topic in news_topics:
        update_firestore(topic)
