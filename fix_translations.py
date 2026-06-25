import os

fixes = {
    # Method names
    "sendMesaj": "sendMessage",
    "editMesajText": "editMessageText",
    "updateTaskMesajId": "updateTaskMessageId",
    "addPuan": "addPoints",
    "getUserTamamlandıTasks": "getUserCompletedTasks",
    
    # Object properties / events
    "new_chat_üye": "new_chat_member",
    "my_chat_üye": "my_chat_member",

    # Module imports
    "./features/liderboard": "./features/leaderboard",
    "./features/yönetici": "./features/admin",
    "./conversations/yönetici_add_committee": "./conversations/admin_add_committee",
    "./conversations/yönetici_promote": "./conversations/admin_promote",
    "yöneticiFeature": "adminFeature",
    "liderboardFeature": "leaderboardFeature",
}

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        for k, v in fixes.items():
            content = content.replace(k, v)
            
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed {filepath}")
    except Exception as e:
        pass

files_to_check = [
    'api/app.ts',
    'api/cron.ts',
    'src/bot.ts',
    'src/features/start.ts',
    'src/features/help.ts',
    'src/features/tasks.ts',
    'src/features/done.ts',
    'src/features/leaderboard.ts',
    'src/features/admin.ts',
    'src/conversations/standup.ts',
    'src/conversations/admin_add_committee.ts',
    'src/conversations/admin_promote.ts'
]

for f in files_to_check:
    process_file(f)
