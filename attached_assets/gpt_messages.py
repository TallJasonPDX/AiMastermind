import os
import sys
import openai
import json
import time
import logging
from dotenv import load_dotenv
from typing import List, Dict, Tuple
# Set the source directory to the root of the project
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.leads import Lead
from models.assistants import Assistant

# Configure logging
logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(levelname)s - %(message)s')
# Reduce verbosity for OpenAI and HTTP request logs
logging.getLogger("openai").setLevel(logging.WARNING)  # Suppress OpenAI logs unless it's a warning/error
logging.getLogger("httpx").setLevel(logging.WARNING)   # Suppress HTTP logs unless there's an issue

# Load environment variables from .env file
load_dotenv()
print(os.getenv("OPEN_AI_KEY"))  # Debugging statement
# Initialize OpenAI client with the API key from environment variables
client = openai.OpenAI(api_key=os.getenv("OPEN_AI_KEY"))  # Corrected API key retrieval
# Define the expected lead structure
LeadType = Dict[str, str]  # Each lead contains id, job_title, company_name, industry, description
ScoreResult = Dict[str, int]  # Each category has an integer score (0-10)
BatchResult = List[Dict[str, ScoreResult]]  # List of results for multiple leads


def object_to_dict(obj, fields):
    """Convert SQLAlchemy model instance to dictionary with specified fields."""
    return {field: str(getattr(obj, field)) for field in fields}



def extract_relevant_lead_data(leads: List[Lead]) -> List[Dict[str, str]]:
    """
    Extracts only the relevant fields from Lead objects for AI processing.

    Args:
        leads (List[Lead]): A list of Lead objects.

    Returns:
        List[Dict[str, str]]: A list of dictionaries containing only the required fields.
    """
    extracted_leads = []

    for lead in leads:
        extracted_leads.append({
            "id": str(lead.id),  # Ensure ID is a string for JSON compatibility
            "job_title": lead.linkedinJobTitle or "",
            "company_name": lead.companyName or "",
            "industry": lead.companyIndustry or "",
            "description": lead.linkedinDescription or ""
        })

    return extracted_leads

def get_assistant_lead_message(lead: Lead, assistant: Assistant) -> Tuple[bool, str]:
    """Send JSON data to OpenAI Assistant v2 and return the text response."""
    
    # Convert lead and group objects to dictionaries
    lead_dict = object_to_dict(lead, ["linkedinJobTitle", "companyName", "linkedinDescription"])
    assistant_id = assistant.assistant_id

    # Convert lead and group data to JSON
    data = {
        "prospect": lead_dict
    }
    prompt = json.dumps(data, indent=2)

    # Step 1: Create a new thread
    thread = client.beta.threads.create()

    # Step 2: Add a message to the thread
    client.beta.threads.messages.create(
        thread_id=thread.id,
        role="user",
        content=f"Assistant: {prompt}"
    )

    # Step 3: Run the assistant on this thread
    run = client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant_id
    )

    # Step 4: Wait for the assistant's response
    while True:
        run_status = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
        if run_status.status not in ["queued", "in_progress"]:
            break
        time.sleep(1)  # Avoid excessive API calls

    # Step 5: Retrieve the assistant's response messages
    messages = client.beta.threads.messages.list(thread_id=thread.id)

    # Step 6: Extract and return the latest assistant response
    for message in reversed(messages.data):  # Loop through messages from latest to oldest
        if message.role == "assistant":
            try:
                return True, message.content[0].text.value.strip()
            except AttributeError:
                return False, ""  # Return empty string if no assistant response is found

    return False, ""  # Return empty string if no assistant response is found


def validate_message(message_in) -> Tuple[bool, str]:
    """Send the message again to make sure it is clean for insertion."""
    
    # Convert lead and group objects to dictionaries
    
    assistant_id = 'asst_Z61mfoAxsi5b3oemZClGp5br'# id for the cleaning assistant.

    # Convert lead and group data to JSON
    
    prompt = message_in

    # Step 1: Create a new thread
    thread = client.beta.threads.create()

    # Step 2: Add a message to the thread
    client.beta.threads.messages.create(
        thread_id=thread.id,
        role="user",
        content=f"Assistant: {prompt}"
    )

    # Step 3: Run the assistant on this thread
    run = client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant_id
    )

    # Step 4: Wait for the assistant's response
    while True:
        run_status = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
        if run_status.status not in ["queued", "in_progress"]:
            break
        time.sleep(1)  # Avoid excessive API calls

    # Step 5: Retrieve the assistant's response messages
    messages = client.beta.threads.messages.list(thread_id=thread.id)

    # Step 6: Extract and return the latest assistant response
    for message in reversed(messages.data):  # Loop through messages from latest to oldest
        if message.role == "assistant":
            return True, message.content[0].text.value.strip()

    return False, ""  # Return empty string if no assistant response is found

def score_leads(leads: List[Lead]) -> Tuple[bool, List[Dict[str, Dict[str, int]]]]:
    """
    Sends a batch of 10 leads to the OpenAI assistant for scoring.

    Args:
        leads (List[Lead]): A list of Lead objects.

    Returns:
        Tuple[bool, List[Dict[str, Dict[str, int]]]]: 
            - Success status (True/False)
            - List of dictionaries containing lead ID and scores for each category.
    """
    assistant_id = 'asst_HgOtJUvM4UW5mfVoSv7Hxx8s'  # Replace with actual assistant ID

    # Step 1: Extract relevant fields for AI processing
    lead_data = extract_relevant_lead_data(leads)

    # Step 2: Create a new thread
    try:
        thread = client.beta.threads.create()
    except Exception as e:
        print(f"Error creating thread: {e}")
        return False, []

    # Step 3: Send the leads as a properly formatted JSON string
    try:
        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=json.dumps({"leads": lead_data}, indent=2)  # Convert dict to JSON string
        )
    except Exception as e:
        print(f"Error sending message to thread: {e}")
        return False, []

    # Step 4: Run the assistant on this thread
    try:
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant_id
        )
    except Exception as e:
        print(f"Error running assistant: {e}")
        return False, []

    # Step 5: Wait for the assistant's response
    try:
        while True:
            run_status = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
            if run_status.status not in ["queued", "in_progress"]:
                break
            time.sleep(5)  # Increase sleep interval to 5 seconds
    except Exception as e:
        print(f"Error retrieving run status: {e}")
        return False, []

    # Step 6: Retrieve the assistant's response messages
    try:
        messages = client.beta.threads.messages.list(thread_id=thread.id)
    except Exception as e:
        print(f"Error retrieving messages: {e}")
        return False, []
    
    # Step 7: Extract the JSON response from the assistant
    for message in reversed(messages.data):
        if message.role == "assistant":
            try:
                response_json = message.content[0].text.value.strip()
                response_data = json.loads(response_json)  # Convert JSON string to dict
                if "results" in response_data:
                    print("Assistant response received.")
                    return True, response_data["results"]
            except Exception as e:
                print(f"Error parsing JSON response: {e}")
                return False, []

    print("No assistant response found.")
    return False, []  # Return empty results on failure