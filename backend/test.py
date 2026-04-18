from brevo import Brevo
from brevo.transactional_emails import (
    SendTransacEmailRequestSender,
    SendTransacEmailRequestToItem,
)
from dotenv import load_dotenv
import os

load_dotenv()

client = Brevo(api_key=os.getenv("BREVO_API_KEY"))
result = client.transactional_emails.send_transac_email(
    subject="Hello from Brevo!",
    html_content="<html><body><p>Hello,</p><p>This is my first transactional email.</p></body></html>",
    sender=SendTransacEmailRequestSender(
        name="Shivam Ingle",
        email="shivam.personalprojects@gmail.com",
    ),
    to=[
        SendTransacEmailRequestToItem(
            email="ingleshivam@gmail.com",
            name="Shivam Ingle",
        )
    ],
)

print("Email sent. Message ID:", result.message_id)
