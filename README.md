# Community Advocacy Tool

A command-line tool for coordinating civic advocacy campaigns to contact local businesses, chambers of commerce, elected officials, and congressional representatives about immigration enforcement policies.

## Features

- **Contact Management**: Store and organize contacts for businesses, chambers of commerce, local officials, and congressional representatives
- **Email Templates**: Pre-written, customizable templates for different recipient types
- **Congressional Resources**: Links and guidance for contacting your representatives in Congress
- **Outreach Tracking**: Log your contacts and track responses
- **Export**: Export contacts to CSV for use in other tools

## Installation

No dependencies required - uses Python standard library only.

```bash
# Make the script executable
chmod +x advocacy_tool.py

# Run the tool
python3 advocacy_tool.py
```

## Usage

### First Run
On first run, you'll be prompted to enter your information (name, address, ZIP code) which will be used to personalize your advocacy messages.

### Main Menu Options

1. **Configure your information** - Update your personal details
2. **Find contacts** - Browse national chains, get search tips for local organizations
3. **Generate email templates** - Create personalized emails for different recipient types
4. **Congressional action resources** - Get info on contacting your representatives
5. **Track your outreach** - Log contacts made and view history
6. **Export contacts to CSV** - Export your contact list
7. **Help & resources** - View advocacy tips and legal resources

## Email Templates Included

- **Business Template**: For contacting corporations about non-cooperation policies
- **Chamber of Commerce Template**: For local business associations
- **Local Official Template**: For mayors, city council, county supervisors
- **Congressional Template**: For House Representatives and Senators

## Configuration

Your settings are stored in `~/.advocacy_tool_config.json`. This includes:
- Your contact information
- Saved contacts
- Outreach history

## Tips for Effective Advocacy

1. **Be respectful and professional** in all communications
2. **Personalize your messages** with local context and personal stories
3. **Follow up** on initial outreach after 1-2 weeks
4. **Coordinate** with local advocacy organizations
5. **Attend public meetings** like city council sessions
6. **Share on social media** to encourage others to participate

## Resources

- ACLU Know Your Rights: https://www.aclu.org/know-your-rights
- National Immigration Law Center: https://www.nilc.org/
- United We Dream: https://unitedwedream.org/
- Find your representatives: https://www.congress.gov/members

## License

Free to use for civic advocacy purposes.
