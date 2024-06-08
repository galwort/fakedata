from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from datetime import datetime, timezone
from logging import info
from requests import post

import azure.functions as func

vault_url = "https://kv-fakedata.vault.azure.net/"
credential = DefaultAzureCredential()
secret_client = SecretClient(vault_url=vault_url, credential=credential)
funckey_topics = secret_client.get_secret("TopicsFunctionKey").value
funckey_scores = secret_client.get_secret("ScoresFunctionKey").value


def main(mytimer: func.TimerRequest) -> None:
    utc_timestamp = datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()

    if mytimer.past_due:
        info("The timer is past due!")

    info("Python timer trigger function ran at %s", utc_timestamp)

    response_one = post(
        "https://fa-fakedata.azurewebsites.net/api/topics?code=" + funckey_topics
    )
    info("Topics response: %s", response_one.status_code)

    response_two = post(
        "https://fa-fakedata.azurewebsites.net/api/scores?code=" + funckey_scores
    )
    info("Scores response: %s", response_two.status_code)
