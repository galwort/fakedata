from argparse import ArgumentParser
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from datetime import datetime, timezone
from firebase_admin import credentials, firestore
from json import loads
from openai import OpenAI
import firebase_admin

vault_url = "https://kv-galwort.vault.azure.net/"
credential = DefaultAzureCredential()
secret_client = SecretClient(vault_url=vault_url, credential=credential)

client = OpenAI(api_key=secret_client.get_secret("OAIKey").value)

firestore_sdk = secret_client.get_secret("FirebaseSDK").value
cred = credentials.Certificate(loads(firestore_sdk))
firebase_admin.initialize_app(cred)
db = firestore.client()


def gen_relevance_scores(topic, model):
    system_message = (
        "You are tasked to evaluate the relevance of a given topic "
        "in each year from 1980 to 2020. "
        "Reply in JSON format with the word 'relevance' as the overall key, "
        "and each year as a key with a value between 0.00 and 1.00."
    )

    messages = [{"role": "system", "content": system_message}]
    user_message = {"role": "user", "content": topic}
    messages.append(user_message)

    response = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=messages,
    )

    json_response = loads(response.choices[0].message.content)
    return json_response["relevance"]


def update_firestore(topic, relevance_scores, model):
    topic = topic.replace(" ", "-").lower()
    topic_ref = db.collection("topics").document(topic)
    topic_doc = topic_ref.get()

    current_time = datetime.now(timezone.utc)

    if topic_doc.exists:
        topic_data = topic_doc.to_dict()
        run = topic_data.get("runs", 0)
    else:
        run = 0
        topic_ref.set(
            {
                "runs": 0,
                "insert_time": current_time,
                "modified_time": current_time,
            }
        )

    new_run = run + 1
    relevance_id = f"{topic}_{new_run}"
    relevance_ref = db.collection("relevance").document(relevance_id)
    relevance_data = {
        "topic": topic,
        "model": model,
        "insert_time": current_time,
        "run": new_run,
        **relevance_scores,
    }

    relevance_ref.set(relevance_data)

    topic_ref.update({"runs": new_run, "modified_time": current_time})


def process_topics(model):
    while True:
        topics_query = db.collection("topics").where("runs", "<", 3).stream()
        topics = [doc.id for doc in topics_query]

        if not topics:
            print("No more topics with fewer than 3 runs.")
            break

        for topic in topics:
            print(f"Processing topic: {topic}")
            relevance_scores = gen_relevance_scores(topic, model)
            update_firestore(topic, relevance_scores, model)
            print(f"Completed processing topic: {topic}")


def main():
    process_topics("gpt-4o")
