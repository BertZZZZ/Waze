import requests

SLACK_API_TOKEN = "xoxp-3248920668-8234061494-15971238192-1b33311070" # get one from https://api.slack.com/docs/oauth-test-tokens
CHANNEL_NAME = "10-vl_onthaal"

channel_list = requests.get('https://slack.com/api/channels.list?token=%s' % SLACK_API_TOKEN).json()['channels']
channel = filter(lambda c: c['name'] == CHANNEL_NAME, channel_list)[0]

channel_info = requests.get('https://slack.com/api/channels.info?token=%s&channel=%s' % (SLACK_API_TOKEN, channel['id'])).json()['channel']
members = channel_info['members']

users_list = requests.get('https://slack.com/api/users.list?token=%s' % SLACK_API_TOKEN).json()['members']
users = filter(lambda u: u['id'] in members, users_list)

for user in users:
    first_name, last_name = '', ''

    if user['real_name']:
        first_name = user['real_name']

        if ' ' in user['real_name']:
            first_name, last_name = user['real_name'].split()
    print "%s,%s,%s" % (first_name, last_name, user['profile']['email'])
