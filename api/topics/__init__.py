import azure.functions as func
from .topics import main as topics_main


def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        topics_main()
        return func.HttpResponse("Function executed successfully.", status_code=200)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=500)
