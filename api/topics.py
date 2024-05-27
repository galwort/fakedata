from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from datetime import datetime, timezone
from firebase_admin import credentials, firestore
from json import loads, dumps
from openai import OpenAI
from requests import get
import firebase_admin

vault_url = "https://kv-galwort.vault.azure.net/"
credential = DefaultAzureCredential()
secret_client = SecretClient(vault_url=vault_url, credential=credential)

client = OpenAI(api_key=secret_client.get_secret("OAIKey").value)

firestore_sdk = secret_client.get_secret("FirebaseSDK").value
cred = credentials.Certificate(loads(firestore_sdk))
firebase_admin.initialize_app(cred)
db = firestore.client()

news_key = secret_client.get_secret("NewsAPIKey").value


def gen_topics_from_topics(model, num_topics=3):
    topics_ref = db.collection("topics")
    topics = [doc.id for doc in topics_ref.stream()]

    system_message = (
        "You are tasked to generate {num_topics} "
        "new topics given a list of existing topics. "
        "These topics should cover a wide range of areas "
        "and be relevant to various fields over time, "
        "and not just relevant to today. They should be "
        "universally relevant and timeless. "
        "Reply in JSON format with the key 'new_topics' "
        "and an array of new topics."
    )
    user_message = {
        "role": "user",
        "content": dumps({"topics": topics, "num_topics": num_topics}),
    }

    messages = [{"role": "system", "content": system_message}, user_message]
    response = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=messages,
    )

    json_response = loads(response.choices[0].message.content)
    return json_response["new_topics"]


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
    system_message = (
        f"You are tasked to generate {num_topics} new topics "
        "given a list of news articles. These topics should cover "
        "a wide range of areas and be relevant to various fields "
        "over time, and not just relevant to today. They should be "
        "universally relevant and timeless. Reply in JSON format "
        "with the key 'new_topics' and an array of new topics."
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
    return json_response["new_topics"]


def update_firestore(topic):
    topic = topic.replace(" ", "-").lower()
    topic_ref = db.collection("topics").document(topic)
    topic_doc = topic_ref.get()

    current_time = datetime.now(timezone.utc)

    if topic_doc.exists:
        print(f"Topic '{topic}' already exists in Firestore. Ignoring.")
        return

    topic_data = {
        "insert_time": current_time,
        "modified_time": current_time,
        "runs": 0,
    }

    topic_ref.set(topic_data)
    print(f"Topic '{topic}' has been added to Firestore.")


if __name__ == "__main__":
    print(gen_topics_from_news("gpt-4o"))
