from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from datetime import datetime, timezone
from firebase_admin import credentials, firestore
from functools import lru_cache
from heapq import nlargest
from json import loads, dumps
from math import sqrt
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
MATERIAL_ICONS_URL = "https://fonts.google.com/metadata/icons"
EMBEDDING_MODEL = "text-embedding-3-small"
ICON_CANDIDATE_COUNT = 12

TOPIC_STYLE_GUIDE = (
    "A topic must be a broad, concrete, plain-language subject bucket: "
    "something someone could browse, search for, or compare over time. "
    "Good examples: 'baseball', 'coffee', 'climate change', 'legal cases', "
    "'renewable materials', 'political campaigns', 'artificial intelligence'. "
    "Bad examples: article headlines, full claims, essay titles, research "
    "questions, academic subfields, speculative combinations, or explanatory "
    "phrases like 'the importance of ...', 'ethical implications of ...', "
    "'history of ...', or 'cross-cultural ...'. Do not use abstract modifier "
    "families such as universal, timeless, philosophical, ethical, cognitive, "
    "cultural, historical, evolutionary, quantum, neuroscience, or ancient. "
    "Multi-word topics must include spaces between the words; never concatenate "
    "them. Prefer one or two words; use three only when that is the natural "
    "name of the subject."
)

def normalize_topic(topic):
    topic = topic.strip().lower()
    topic = re.sub(r"[^a-z0-9]+", "-", topic)
    return re.sub(r"-+", "-", topic).strip("-")


def icon_text(icon):
    return " ".join(
        [
            icon["name"].replace("_", " "),
            " ".join(icon.get("categories") or []),
            " ".join(icon.get("tags") or []),
        ]
    ).strip()


def vector_norm(vector):
    return sqrt(sum(value * value for value in vector))


def embed_texts(texts):
    vectors = []
    for i in range(0, len(texts), 256):
        vectors.extend(
            item.embedding
            for item in client.embeddings.create(
                model=EMBEDDING_MODEL, input=texts[i : i + 256]
            ).data
        )
    return vectors


@lru_cache(maxsize=1)
def material_icons():
    response = get(MATERIAL_ICONS_URL, timeout=30)
    response.raise_for_status()
    raw = response.text
    data = loads(raw[5:] if raw.startswith(")]}'") else raw)
    return tuple(
        icon
        for icon in data["icons"]
        if icon["name"] != "category"
        and "Material Icons" not in icon.get("unsupported_families", [])
    )


@lru_cache(maxsize=1)
def material_icon_vectors():
    icons = material_icons()
    vectors = embed_texts([icon_text(icon) for icon in icons])
    return tuple(
        (icon, vector, vector_norm(vector))
        for icon, vector in zip(icons, vectors)
    )


def top_material_icon_candidates(topic, limit=ICON_CANDIDATE_COUNT):
    query_vector = embed_texts([topic.replace("-", " ")])[0]
    query_norm = vector_norm(query_vector)

    def score(icon_vector):
        _, vector, norm = icon_vector
        if not query_norm or not norm:
            return 0
        return sum(a * b for a, b in zip(query_vector, vector)) / (query_norm * norm)

    return [
        icon
        for icon, _, _ in nlargest(limit, material_icon_vectors(), key=score)
    ]


def choose_material_icon(topic, model):
    candidates = top_material_icon_candidates(topic)
    candidate_names = {icon["name"] for icon in candidates}
    response = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "Choose the single best Google Material Icon for the topic. "
                    "Return JSON with the key 'Material_Icon'. Choose exactly one "
                    "icon name from candidate_icons."
                ),
            },
            {
                "role": "user",
                "content": dumps(
                    {
                        "topic": topic.replace("-", " "),
                        "candidate_icons": [
                            {
                                "icon": icon["name"],
                                "categories": icon.get("categories") or [],
                                "tags": icon.get("tags") or [],
                            }
                            for icon in candidates
                        ],
                    }
                ),
            },
        ],
    )
    icon = loads(response.choices[0].message.content).get("Material_Icon", "").strip()
    if icon not in candidate_names:
        raise ValueError(f"OpenAI selected non-candidate icon: {icon}")
    return icon


def normalize_generated_topics(generated_topics, limit):
    normalized_topics = []
    seen = set()

    if not isinstance(generated_topics, list):
        generated_topics = []

    for item in generated_topics:
        if not isinstance(item, dict):
            continue

        topic = item.get("topic") or item.get("name") or item.get("label")
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
        "Do not create new topics by adding academic modifiers or abstract "
        "qualifiers to existing topics. "
        "Silently discard any candidate that does not meet this standard. "
        "Reply in JSON format with the key 'new_topics' "
        "and an array of new topic objects. Each object must have a 'topic' key."
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
    return normalize_generated_topics(json_response.get("new_topics", []), num_topics)


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
        "a wide range of concrete subject areas. They should be broad enough "
        "to track over time, and not just relevant to today's headline. "
        f"{TOPIC_STYLE_GUIDE} "
        "Extract the underlying subject, not the article headline. "
        "Silently discard any candidate that does not meet this standard. "
        "Reply in JSON format with the key 'new_topics' "
        "and an array of new topic objects. Each object must have a 'topic' key."
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
    return normalize_generated_topics(json_response.get("new_topics", []), num_topics)


def update_firestore(topic, model):
    topic = normalize_topic(topic)
    if not topic:
        return False

    topic_ref = db.collection("topics").document(topic)
    topic_doc = topic_ref.get()

    current_time = datetime.now(timezone.utc)

    if topic_doc.exists:
        topic_data = topic_doc.to_dict() or {}
        if not str(topic_data.get("Material_Icon") or "").strip():
            icon = choose_material_icon(topic, model)
            topic_ref.update({"Material_Icon": icon})
            print(f"Topic '{topic}' already exists. Added icon '{icon}'.")
        print(f"Topic '{topic}' already exists in Firestore. Ignoring.")
        return False

    icon = choose_material_icon(topic, model)
    topic_data = {
        "insert_time": current_time,
        "Material_Icon": icon,
        "modified_time": current_time,
        "runs": 0,
    }

    topic_ref.set(topic_data)
    print(f"Topic '{topic}' has been added to Firestore with icon '{icon}'.")
    return True


def main():
    model = "gpt-4o"

    new_topics = gen_topics_from_topics(model)
    for topic_data in new_topics:
        update_firestore(topic_data, model)

    news_topics = gen_topics_from_news(model)
    for topic_data in news_topics:
        update_firestore(topic_data, model)
