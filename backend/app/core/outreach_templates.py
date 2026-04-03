"""Stage-specific outreach templates based on coffee chat research.

Each Pipeline stage has a suggested action and template.
"""

from __future__ import annotations

import database as db


def get_suggested_action(contact_id: int) -> dict:
    """Get the suggested action + template for a pipeline contact's current stage."""
    # Get pipeline info
    with db.get_db() as conn:
        pipeline = conn.execute(
            "SELECT stage, notes FROM pipeline_contacts WHERE contact_id = ?",
            (contact_id,),
        ).fetchone()

    if not pipeline:
        return {"action": "none", "message": "Not in pipeline"}

    stage = dict(pipeline)["stage"]

    # Get contact details
    with db.get_db() as conn:
        contact = conn.execute(
            """SELECT c.*, co.name as company_name
               FROM contacts c JOIN companies co ON c.company_id = co.id
               WHERE c.id = ?""",
            (contact_id,),
        ).fetchone()

    if not contact:
        return {"action": "none", "message": "Contact not found"}

    c = dict(contact)
    first_name = c.get("name", "").split()[0] if c.get("name") else "there"
    company = c.get("company_name", "")
    prefs = db.get_user_preferences()
    user_uni = prefs.get("current_university", "your university")

    templates = {
        "researched": {
            "action": "Research this contact",
            "description": "Spend 20-30 min researching their background before reaching out",
            "checklist": [
                "Review their LinkedIn profile",
                "Note 2-3 key career experiences",
                f"Research {company} — recent news, deals, culture",
                "Prepare 5 questions for the conversation",
            ],
        },
        "connected": {
            "action": "Send initial outreach",
            "description": "Send a personalized email or LinkedIn message",
            "template": (
                f"Hi {first_name},\n\n"
                f"I'm a student at {user_uni} interested in your work at {company}. "
                f"I'd love to learn more about your experience and ask a few questions. "
                f"Would you have 15 minutes for a quick call?\n\n"
                f"Thanks so much!"
            ),
            "subject": f"{user_uni} student — quick question about {company}",
        },
        "email_sent": {
            "action": "Send follow-up",
            "description": "Follow up on your initial email (reply to the same thread)",
            "template": (
                f"{first_name}, just wanted to follow up on my earlier note. "
                f"I completely understand you're busy. "
                f"If a quick chat isn't feasible, I'd also appreciate any advice "
                f"you'd be willing to share over email."
            ),
            "subject": f"Following up — {user_uni} student",
        },
        "follow_up": {
            "action": "Check in or move on",
            "description": "Send one more follow-up or lower priority",
            "template": (
                f"Hi {first_name}, I hope you're doing well. "
                f"I wanted to reach out one more time — I'm still very interested "
                f"in learning about your experience at {company}. "
                f"No worries if the timing doesn't work!"
            ),
            "subject": f"One more note — {user_uni} student",
        },
        "responded": {
            "action": "Send thank-you",
            "description": "Send a thank-you within 24 hours of your conversation",
            "template": (
                f"Hi {first_name},\n\n"
                f"Thank you so much for taking the time to chat today. "
                f"I really appreciated hearing about [SPECIFIC TOPIC]. "
                f"Your advice on [SPECIFIC PIECE] was particularly helpful, "
                f"and I plan to [HOW YOU'LL APPLY IT].\n\n"
                f"I'd love to stay in touch. Thanks again!"
            ),
            "subject": f"Thank you, {first_name}!",
        },
        "meeting_set": {
            "action": "Prepare for meeting",
            "description": "Final prep before your coffee chat",
            "checklist": [
                "Review your research notes",
                "Prepare 5-10 questions",
                "Have your 30-second story ready",
                "Know 1 recent deal/news about their firm",
                "Test your tech (Zoom link, audio)",
            ],
        },
    }

    return templates.get(stage, {"action": "none", "message": f"No template for stage: {stage}"})
