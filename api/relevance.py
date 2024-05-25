from argparse import ArgumentParser
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from datetime import datetime
from firebase_admin import credentials
from firebase_admin import firestore
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


def gen_relevance_scores(topic):
    system_message = (
        "You are tasked to evaluate the relevance of a given topic "
        + "in each year from 1980 to 2020. "
        + "Reply in JSON format with the word 'relevance' as the overall key, "
        + "and each year as a key with a value between 0.00 and 1.00. "
    )

    messages = [{"role": "system", "content": system_message}]
    user_message = {"role": "user", "content": topic}
    messages.append(user_message)

    response = client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=messages,
    )

    json_response = loads(response.choices[0].message.content)
    return json_response["relevance"]


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("topic", type=str)
    args = parser.parse_args()

    relevance_scores = gen_relevance_scores(args.topic)
    print(relevance_scores)
