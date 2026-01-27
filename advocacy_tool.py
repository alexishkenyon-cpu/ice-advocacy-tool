#!/usr/bin/env python3
"""
ICE Non-Cooperation Advocacy Hub
All-in-one tool for contacting corporations, Congress, and local officials.
No extra research needed - just pick an action and go.
"""

import json
import os
import sys
import subprocess
import platform
import urllib.parse
from datetime import datetime

# ============================================================================
# CONFIGURATION
# ============================================================================

CONFIG_FILE = os.path.expanduser("~/.ice_advocacy_config.json")

DEFAULT_CONFIG = {
    "user_name": "",
    "user_email": "",
    "user_address": "",
    "user_city": "",
    "user_state": "",
    "zip_code": "",
    "phone": "",
    "actions_taken": []
}

def load_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return DEFAULT_CONFIG.copy()

def save_config(config: dict):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

# ============================================================================
# CEO CONTACTS - From 50501 Minnesota Campaign + Additional
# ============================================================================

CEO_TARGETS = [
    {
        "company": "Target",
        "ceo": "Brian Cornell",
        "title": "Chair & CEO",
        "phone": "612-304-6073",
        "email": "brian.cornell@target.com",
        "complicit": True,
        "notes": "Target has allowed ICE operations in stores"
    },
    {
        "company": "Home Depot",
        "ceo": "Ted Decker",
        "title": "Chair, President & CEO",
        "phone": "(800) 466-3337",
        "email": "ted_decker@homedepot.com",
        "complicit": True,
        "notes": "Home Depot has cooperated with ICE"
    },
    {
        "company": "Enterprise",
        "ceo": "Chrissy Taylor",
        "title": "President & CEO",
        "phone": "(314)-512-5000",
        "email": "christine.taylor@ehi.com",
        "complicit": True,
        "notes": "Enterprise has provided vehicles/services to ICE"
    },
    {
        "company": "Hilton",
        "ceo": "Christopher J. Nassetta",
        "title": "President & CEO",
        "phone": "(703) 883-1000",
        "email": "christopher.nassetta@hilton.com",
        "complicit": True,
        "notes": "Hilton hotels used for ICE detention"
    },
    {
        "company": "Delta Air Lines",
        "ceo": "Ed Bastian",
        "title": "CEO",
        "phone": "(404) 715-2600",
        "email": "ed.bastian@delta.com",
        "complicit": True,
        "notes": "Delta has transported deportees"
    },
    {
        "company": "Walmart",
        "ceo": "Doug McMillon",
        "title": "President & CEO",
        "phone": "(479) 273-4000",
        "email": "doug.mcmillon@walmart.com",
        "complicit": False,
        "notes": "Largest retailer - policy unclear"
    },
    {
        "company": "Amazon",
        "ceo": "Andy Jassy",
        "title": "President & CEO",
        "phone": "(206) 266-1000",
        "email": "ajassy@amazon.com",
        "complicit": True,
        "notes": "AWS provides cloud services to ICE"
    },
    {
        "company": "Microsoft",
        "ceo": "Satya Nadella",
        "title": "CEO",
        "phone": "(425) 882-8080",
        "email": "satyan@microsoft.com",
        "complicit": True,
        "notes": "Azure contracts with ICE"
    },
    {
        "company": "Palantir",
        "ceo": "Alex Karp",
        "title": "CEO",
        "phone": "(720) 358-3679",
        "email": "info@palantir.com",
        "complicit": True,
        "notes": "Provides surveillance software to ICE"
    },
    {
        "company": "JPMorgan Chase",
        "ceo": "Jamie Dimon",
        "title": "Chairman & CEO",
        "phone": "(212) 270-6000",
        "email": "jamie.dimon@jpmchase.com",
        "complicit": True,
        "notes": "Finances private detention centers"
    },
]

# ============================================================================
# PRE-WRITTEN SCRIPTS
# ============================================================================

CEO_CALL_SCRIPT = """
CALL SCRIPT FOR {company} ({ceo})
══════════════════════════════════════════════════════════════

"Hello, I'm calling to speak with someone who can take a message
for {ceo}.

My name is {user_name} and I'm a {customer_type} calling to urge
{company} to publicly commit to NOT cooperating with ICE.

Workers, customers, and communities deserve safety, dignity,
and transparency. Corporate leaders should be accountable to
the people they impact.

I'm asking {company} to:
1. Not allow ICE agents into facilities without a judicial warrant
2. Not share employee or customer data with ICE
3. Make a public statement committing to these policies

Thank you for taking my message."

══════════════════════════════════════════════════════════════
Phone: {phone}
"""

CEO_EMAIL_TEMPLATE = """Subject: Urging {company} to Commit to Non-Cooperation with ICE

Dear {ceo},

I am writing as a concerned {customer_type} to urge {company} to publicly commit to a policy of non-cooperation with Immigration and Customs Enforcement (ICE).

Workers, customers, and communities deserve safety, dignity, and transparency. Corporate leaders should be accountable to the people they impact.

I am specifically asking {company} to:

1. Not voluntarily allow ICE agents access to your facilities without a judicial warrant
2. Not share employee or customer information with ICE without a judicial warrant
3. Issue a public statement affirming these commitments

Many major corporations have adopted such policies. I hope {company} will do the right thing.

Sincerely,
{user_name}
{user_address}
{user_city}, {user_state} {zip_code}
"""

CONGRESS_CALL_SCRIPT = """
CALL SCRIPT FOR YOUR REPRESENTATIVE/SENATOR
══════════════════════════════════════════════════════════════

"Hello, my name is {user_name} and I'm a constituent from
{user_city}, {user_state}, ZIP code {zip_code}.

I'm calling to urge [Representative/Senator name] to OPPOSE
any increases in funding for ICE.

Last year, Trump and Congressional Republicans nearly tripled
funding for ICE, making it the highest-funded law enforcement
agency in the country. This money came from cutting healthcare
and other vital services.

Our tax dollars should NOT be used to terrorize communities.
I urge you to withhold funding for ICE until they are held
accountable.

Thank you for your time."

══════════════════════════════════════════════════════════════
"""

CONGRESS_EMAIL_TEMPLATE = """Subject: FREEZE FUNDING FOR ICE

Dear [Representative/Senator],

I am your constituent from {user_city}, {user_state} ({zip_code}).

I urge you to OPPOSE any increases in funding for Immigration and Customs Enforcement (ICE).

Last year, Congress nearly tripled funding for ICE, making it the highest-funded law enforcement agency in the country. This money came at the expense of healthcare funding and vital social services.

Our tax dollars should not be used to terrorize communities, harass residents, or separate families.

I urge you to:
- Vote against appropriations bills that increase ICE funding
- Support oversight and accountability measures for ICE
- Publicly oppose aggressive enforcement in community spaces

Please stand up for your constituents.

Sincerely,
{user_name}
{user_address}
{user_city}, {user_state} {zip_code}
"""

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def open_phone_dialer(phone_number: str):
    """Open phone dialer with the number."""
    clean_number = ''.join(c for c in phone_number if c.isdigit() or c == '+')
    if platform.system() == 'Darwin':  # macOS
        subprocess.run(['open', f'tel:{clean_number}'], check=False)
    elif platform.system() == 'Linux':
        subprocess.run(['xdg-open', f'tel:{clean_number}'], check=False)
    else:
        print(f"\n>>> CALL THIS NUMBER: {phone_number}")

def open_email_client(to: str, subject: str, body: str):
    """Open default email client with pre-filled email."""
    subject_encoded = urllib.parse.quote(subject)
    body_encoded = urllib.parse.quote(body)
    mailto_url = f"mailto:{to}?subject={subject_encoded}&body={body_encoded}"

    if platform.system() == 'Darwin':
        subprocess.run(['open', mailto_url], check=False)
    elif platform.system() == 'Linux':
        subprocess.run(['xdg-open', mailto_url], check=False)
    else:
        print(f"\n>>> Send email to: {to}")
        print(f">>> Subject: {subject}")

def open_url(url: str):
    """Open URL in default browser."""
    if platform.system() == 'Darwin':
        subprocess.run(['open', url], check=False)
    elif platform.system() == 'Linux':
        subprocess.run(['xdg-open', url], check=False)
    else:
        print(f"\n>>> Open this URL: {url}")

def log_action(config: dict, action_type: str, target: str, method: str):
    """Log an advocacy action taken."""
    if "actions_taken" not in config:
        config["actions_taken"] = []

    config["actions_taken"].append({
        "date": datetime.now().isoformat(),
        "type": action_type,
        "target": target,
        "method": method
    })
    save_config(config)

# ============================================================================
# MENU SCREENS
# ============================================================================

def print_banner():
    clear_screen()
    print("""
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     ██╗ ██████╗███████╗     █████╗  ██████╗████████╗██╗ ██████╗  ║
║     ██║██╔════╝██╔════╝    ██╔══██╗██╔════╝╚══██╔══╝██║██╔═══██╗ ║
║     ██║██║     █████╗      ███████║██║        ██║   ██║██║   ██║ ║
║     ██║██║     ██╔══╝      ██╔══██║██║        ██║   ██║██║   ██║ ║
║     ██║╚██████╗███████╗    ██║  ██║╚██████╗   ██║   ██║╚██████╔╝ ║
║     ╚═╝ ╚═════╝╚══════╝    ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝  ║
║                                                                  ║
║         TELL CORPORATIONS: DON'T COOPERATE WITH ICE              ║
║         One-stop advocacy hub - no research needed               ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
    """)

def setup_user(config: dict) -> dict:
    """Quick setup for new users."""
    print("\n" + "="*60)
    print("QUICK SETUP - We need a few details to personalize your messages")
    print("="*60 + "\n")

    config["user_name"] = input("Your full name: ").strip()
    config["user_address"] = input("Street address: ").strip()
    config["user_city"] = input("City: ").strip()
    config["user_state"] = input("State (e.g., CA, NY): ").strip().upper()
    config["zip_code"] = input("ZIP code: ").strip()
    config["user_email"] = input("Email (optional, press Enter to skip): ").strip()
    config["phone"] = input("Phone (optional, press Enter to skip): ").strip()

    save_config(config)
    print("\n✓ Setup complete! Your info is saved for future use.")
    input("\nPress Enter to continue...")
    return config

def main_menu():
    print("""
┌──────────────────────────────────────────────────────────────────┐
│  MAIN MENU                                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 📞 CONTACT CORPORATE CEOs                                    │
│     Call or email CEOs of companies complicit with ICE           │
│                                                                  │
│  2. 🏛️  CONTACT CONGRESS                                         │
│     Call your senators and representatives about ICE funding     │
│                                                                  │
│  3. 📝 STAND UP AMERICA PETITION                                 │
│     Quick online petition to freeze ICE funding                  │
│                                                                  │
│  4. 📊 VIEW YOUR ADVOCACY STATS                                  │
│     See how many actions you've taken                            │
│                                                                  │
│  5. ⚙️  UPDATE YOUR INFO                                          │
│     Change your name, address, etc.                              │
│                                                                  │
│  6. 📚 RESOURCES & KNOW YOUR RIGHTS                              │
│                                                                  │
│  0. Exit                                                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
    """)
    return input("Select an option: ").strip()

# ============================================================================
# CORPORATE CEO ACTIONS
# ============================================================================

def corporate_menu(config: dict):
    """Menu for contacting corporate CEOs."""
    while True:
        clear_screen()
        print("""
╔══════════════════════════════════════════════════════════════════╗
║  TELL CORPORATIONS: DON'T COOPERATE WITH ICE                     ║
╠══════════════════════════════════════════════════════════════════╣
║  Select a company to contact their CEO:                          ║
╚══════════════════════════════════════════════════════════════════╝
""")

        # Show complicit companies first
        complicit = [c for c in CEO_TARGETS if c.get("complicit")]
        others = [c for c in CEO_TARGETS if not c.get("complicit")]

        print("  COMPANIES WITH ICE TIES:")
        print("  " + "─"*60)
        for i, target in enumerate(complicit, 1):
            status = "🔴" if target.get("complicit") else "⚪"
            print(f"  {i:2}. {status} {target['company']:<15} - {target['ceo']} ({target['title']})")

        if others:
            print("\n  OTHER MAJOR CORPORATIONS:")
            print("  " + "─"*60)
            for i, target in enumerate(others, len(complicit) + 1):
                print(f"  {i:2}. ⚪ {target['company']:<15} - {target['ceo']} ({target['title']})")

        print("\n  0. Back to main menu")
        print()

        choice = input("  Select company number: ").strip()

        if choice == '0':
            return

        try:
            idx = int(choice) - 1
            all_targets = complicit + others
            if 0 <= idx < len(all_targets):
                contact_ceo(config, all_targets[idx])
        except ValueError:
            pass

def contact_ceo(config: dict, target: dict):
    """Contact a specific CEO."""
    clear_screen()
    print(f"""
╔══════════════════════════════════════════════════════════════════╗
║  CONTACT: {target['company'].upper():<53} ║
╠══════════════════════════════════════════════════════════════════╣
║  CEO: {target['ceo']:<57} ║
║  Title: {target['title']:<55} ║
║  Phone: {target['phone']:<55} ║
║  Email: {target['email']:<55} ║
╠══════════════════════════════════════════════════════════════════╣
║  Notes: {target.get('notes', 'N/A'):<55} ║
╚══════════════════════════════════════════════════════════════════╝

  What would you like to do?

  1. 📞 CALL - Opens phone dialer with script
  2. 📧 EMAIL - Opens email with pre-written message
  3. 📋 COPY SCRIPT - View/copy the call script
  4. 📋 COPY EMAIL - View/copy the email template

  0. Back
""")

    choice = input("  Select action: ").strip()

    user_name = config.get('user_name', 'A concerned citizen')
    user_address = config.get('user_address', '')
    user_city = config.get('user_city', '')
    user_state = config.get('user_state', '')
    zip_code = config.get('zip_code', '')

    if choice == '1':
        # Show script and open dialer
        script = CEO_CALL_SCRIPT.format(
            company=target['company'],
            ceo=target['ceo'],
            user_name=user_name,
            customer_type="customer and community member",
            phone=target['phone']
        )
        print(script)
        input("\nPress Enter to open phone dialer...")
        open_phone_dialer(target['phone'])
        log_action(config, "corporate", target['company'], "call")
        print("\n✓ Action logged! Great work!")
        input("Press Enter to continue...")

    elif choice == '2':
        # Open email client
        subject = f"Urging {target['company']} to Commit to Non-Cooperation with ICE"
        body = CEO_EMAIL_TEMPLATE.format(
            company=target['company'],
            ceo=target['ceo'],
            user_name=user_name,
            user_address=user_address,
            user_city=user_city,
            user_state=user_state,
            zip_code=zip_code,
            customer_type="customer and community member"
        )
        print("\n  Opening email client...")
        open_email_client(target['email'], subject, body)
        log_action(config, "corporate", target['company'], "email")
        print("\n✓ Action logged! Great work!")
        input("Press Enter to continue...")

    elif choice == '3':
        # Show script
        script = CEO_CALL_SCRIPT.format(
            company=target['company'],
            ceo=target['ceo'],
            user_name=user_name,
            customer_type="customer and community member",
            phone=target['phone']
        )
        print(script)
        input("\nPress Enter to continue...")

    elif choice == '4':
        # Show email
        email = CEO_EMAIL_TEMPLATE.format(
            company=target['company'],
            ceo=target['ceo'],
            user_name=user_name,
            user_address=user_address,
            user_city=user_city,
            user_state=user_state,
            zip_code=zip_code,
            customer_type="customer and community member"
        )
        print(f"\n  TO: {target['email']}")
        print(email)
        input("\nPress Enter to continue...")

# ============================================================================
# CONGRESS ACTIONS
# ============================================================================

def congress_menu(config: dict):
    """Menu for contacting Congress."""
    while True:
        clear_screen()
        zip_code = config.get('zip_code', '')

        print(f"""
╔══════════════════════════════════════════════════════════════════╗
║  CONTACT CONGRESS - FREEZE ICE FUNDING                           ║
╠══════════════════════════════════════════════════════════════════╣
║  Your ZIP: {zip_code:<52} ║
╚══════════════════════════════════════════════════════════════════╝

  1. 🔍 FIND MY REPRESENTATIVES
     Opens Congress.gov to find your reps by ZIP code

  2. 📞 GET CALL SCRIPT
     Pre-written script to read when you call

  3. 📧 GET EMAIL TEMPLATE
     Pre-written email to send to your reps

  4. 🌐 OPEN 5 CALLS APP
     The 5 Calls app gives you scripts + direct dial

  5. 📝 STAND UP AMERICA PETITION
     Quick online petition - they email Congress for you

  0. Back to main menu
""")

        choice = input("  Select option: ").strip()

        if choice == '0':
            return
        elif choice == '1':
            find_representatives(config)
        elif choice == '2':
            show_congress_call_script(config)
        elif choice == '3':
            show_congress_email(config)
        elif choice == '4':
            print("\n  Opening 5 Calls...")
            open_url("https://5calls.org/")
            input("  Press Enter to continue...")
        elif choice == '5':
            open_petition()

def find_representatives(config: dict):
    """Open Congress.gov to find representatives."""
    zip_code = config.get('zip_code', '')

    print(f"""

  Finding your representatives...

  Your ZIP code: {zip_code}

  Opening Congress.gov in your browser...
""")

    if zip_code:
        url = f"https://www.congress.gov/members?q=%7B%22address%22%3A%22{zip_code}%22%7D"
    else:
        url = "https://www.congress.gov/members"

    open_url(url)

    print("""
  Also useful:
  - House: https://www.house.gov/representatives/find-your-representative
  - Senate: https://www.senate.gov/senators/senators-contact.htm
  - 5 Calls app: https://5calls.org/
""")
    input("  Press Enter to continue...")

def show_congress_call_script(config: dict):
    """Show the call script for Congress."""
    user_name = config.get('user_name', '[YOUR NAME]')
    user_city = config.get('user_city', '[YOUR CITY]')
    user_state = config.get('user_state', '[STATE]')
    zip_code = config.get('zip_code', '[ZIP]')

    script = CONGRESS_CALL_SCRIPT.format(
        user_name=user_name,
        user_city=user_city,
        user_state=user_state,
        zip_code=zip_code
    )

    print(script)

    print("""
  TIP: Find your rep's phone number at:
  - https://www.house.gov/representatives/find-your-representative
  - https://www.senate.gov/senators/senators-contact.htm
  - Or use 5 Calls app which connects you directly
""")

    log_action(config, "congress", "Congress", "call_script_viewed")
    input("  Press Enter to continue...")

def show_congress_email(config: dict):
    """Show email template for Congress."""
    user_name = config.get('user_name', '[YOUR NAME]')
    user_address = config.get('user_address', '[YOUR ADDRESS]')
    user_city = config.get('user_city', '[YOUR CITY]')
    user_state = config.get('user_state', '[STATE]')
    zip_code = config.get('zip_code', '[ZIP]')

    email = CONGRESS_EMAIL_TEMPLATE.format(
        user_name=user_name,
        user_address=user_address,
        user_city=user_city,
        user_state=user_state,
        zip_code=zip_code
    )

    print(email)
    print("""
  TIP: Find your rep's contact form at:
  - https://www.house.gov/representatives/find-your-representative
  - https://www.senate.gov/senators/senators-contact.htm
""")

    log_action(config, "congress", "Congress", "email_template_viewed")
    input("  Press Enter to continue...")

# ============================================================================
# PETITION
# ============================================================================

def open_petition():
    """Open Stand Up America petition."""
    print("""

  STAND UP AMERICA PETITION
  ═════════════════════════

  "Tell Congress: Freeze Funding for ICE!"

  This petition lets you quickly email your senators and
  representatives. Just fill in your info and they send
  the message for you.

  Opening petition page...
""")
    open_url("https://act.standupamerica.com/")
    input("  Press Enter to continue...")

# ============================================================================
# STATS & RESOURCES
# ============================================================================

def show_stats(config: dict):
    """Show advocacy statistics."""
    clear_screen()
    actions = config.get('actions_taken', [])

    print("""
╔══════════════════════════════════════════════════════════════════╗
║  YOUR ADVOCACY STATS                                             ║
╚══════════════════════════════════════════════════════════════════╝
""")

    if not actions:
        print("  You haven't taken any logged actions yet.")
        print("  Start by contacting a corporate CEO or your Congress member!")
    else:
        corporate_actions = [a for a in actions if a['type'] == 'corporate']
        congress_actions = [a for a in actions if a['type'] == 'congress']

        print(f"  Total actions: {len(actions)}")
        print(f"  Corporate contacts: {len(corporate_actions)}")
        print(f"  Congress contacts: {len(congress_actions)}")
        print()
        print("  Recent actions:")
        print("  " + "─"*50)
        for action in actions[-10:]:
            date = action['date'][:10]
            print(f"  {date} - {action['type']}: {action['target']} ({action['method']})")

    print()
    input("  Press Enter to continue...")

def show_resources():
    """Show resources and know your rights info."""
    clear_screen()
    print("""
╔══════════════════════════════════════════════════════════════════╗
║  RESOURCES & KNOW YOUR RIGHTS                                    ║
╚══════════════════════════════════════════════════════════════════╝

  KNOW YOUR RIGHTS
  ────────────────
  - ACLU Know Your Rights: https://www.aclu.org/know-your-rights
  - National Immigration Law Center: https://www.nilc.org/
  - United We Dream: https://unitedwedream.org/
  - Immigrant Legal Resource Center: https://www.ilrc.org/

  BUSINESS RIGHTS (for businesses)
  ─────────────────────────────────
  - Businesses can require a JUDICIAL warrant (not ICE administrative
    warrants) before allowing access to non-public areas
  - Businesses can refuse to answer questions about employees
  - Businesses can refuse to consent to searches

  ADVOCACY ORGANIZATIONS
  ──────────────────────
  - Stand Up America: https://standupamerica.com/
  - 50501 Minnesota: https://www.50501mn.org/
  - 5 Calls: https://5calls.org/
  - Indivisible: https://indivisible.org/

  REPORTING ICE ACTIVITY
  ──────────────────────
  - United We Dream hotline: 1-844-363-1423
  - Local rapid response networks vary by city

  SANCTUARY CITY INFO
  ───────────────────
  Many cities limit cooperation with ICE. Check if your city
  has sanctuary policies at your city government website.

""")
    input("  Press Enter to continue...")

# ============================================================================
# MAIN
# ============================================================================

def main():
    config = load_config()

    # First-time setup
    if not config.get('user_name'):
        print_banner()
        print("\n  Welcome! Let's get you set up for advocacy.\n")
        config = setup_user(config)

    while True:
        print_banner()
        choice = main_menu()

        if choice == '1':
            corporate_menu(config)
        elif choice == '2':
            congress_menu(config)
        elif choice == '3':
            open_petition()
        elif choice == '4':
            show_stats(config)
        elif choice == '5':
            config = setup_user(config)
        elif choice == '6':
            show_resources()
        elif choice == '0':
            print("\n  Thank you for taking action! Every voice matters.\n")
            sys.exit(0)

if __name__ == "__main__":
    main()
