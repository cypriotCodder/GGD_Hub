import os

replacements = {
    # src/conversations/standup.ts
    "Weekly Standup": "Haftalık Standup",
    "Let's go through your update step by step.": "Şimdi adım adım güncellemeni alalım.",
    "Type your answer below:": "Cevabınızı aşağıya yazın:",
    "What are you working on next?": "Sırada üzerinde çalışacağın ne var?",
    "Any blockers or help needed?": "Herhangi bir engel var mı veya yardıma ihtiyacın var mı?",
    'Type your answer, or send "none" if all clear:': 'Cevabınızı yazın veya sorun yoksa "yok" yazın:',
    "Standup Complete!": "Standup Tamamlandı!",
    "Next:": "Sırada:",
    "Blockers:": "Engeller:",
    "Your update has been posted to your committee chats.": "Güncellemeniz komite sohbetlerinde paylaşıldı.",
    "Failed to post summary to group": "Özet gruba gönderilemedi",
    "You're not part of any committee yet. Use /start to join one first!": "Henüz herhangi bir komitenin parçası değilsiniz. Birine katılmak için /start'ı kullanın!",
    
    # src/features/start.ts
    "Welcome to the Hub!": "Hub'a Hoş Geldiniz!",
    "It looks like you aren't assigned to any committees yet.": "Görünüşe göre henüz bir komiteye atanmamışsınız.",
    "Please select your committee below to join:": "Katılmak için lütfen aşağıdaki listeden komitenizi seçin:",
    "You are already set up!": "Zaten ayarlısınız!",
    "Use the Web Dashboard button below to manage your tasks.": "Görevlerinizi yönetmek için aşağıdaki Web Dashboard butonunu kullanın.",
    
    # src/features/help.ts
    "Available commands:": "Kullanılabilir komutlar:",
    "/start - Join a committee": "/start - Bir komiteye katıl",
    "/tasks - View your active tasks": "/tasks - Aktif görevlerinizi görüntüleyin",
    "/done - Mark a task as completed": "/done - Bir görevi tamamlandı olarak işaretle",
    "/leaderboard - See top volunteers": "/leaderboard - En iyi gönüllüleri gör",
    "/myid - Get your Telegram ID (for admins)": "/myid - Telegram ID'nizi alın (yöneticiler için)",

    # src/bot.ts
    "An unexpected error occurred. Please try again later.": "Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
    "Hi! Thanks for adding me.": "Merhaba! Beni eklediğiniz için teşekkürler.",
    "My Chat ID for this group is:": "Bu grup için Sohbet ID'm:",
    "Use this ID in the Web Dashboard to register this committee.": "Bu komiteyi kaydetmek için bu ID'yi Web Dashboard'da kullanın.",

    # src/features/tasks.ts
    "You have no active tasks. Awesome!": "Hiç aktif göreviniz yok. Harika!",
    "Your Active Tasks:": "Aktif Görevleriniz:",
    "points": "puan",

    # src/features/done.ts
    "You don't have any active tasks to complete.": "Tamamlanacak aktif göreviniz yok.",
    "Which task did you complete?": "Hangi görevi tamamladınız?",
}

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        for k, v in replacements.items():
            content = content.replace(k, v)
            
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

files_to_process = [
    'src/conversations/standup.ts',
    'src/features/start.ts',
    'src/features/help.ts',
    'src/bot.ts',
    'src/features/tasks.ts',
    'src/features/done.ts'
]

for f in files_to_process:
    process_file(f)
