import os

replacements = {
    # App.jsx Tabs
    "'Analytics'": "'Analiz'",
    "'Committees'": "'Komiteler'",
    "'Members'": "'Üyeler'",
    "'Tasks'": "'Görevler'",
    "'Standups'": "'Standup\\'lar'",
    "'Leaderboard'": "'Liderlik Tablosu'",
    "'Settings'": "'Ayarlar'",

    # MemberPortal.jsx Tabs
    "'My Tasks'": "'Görevlerim'",
    "'Available'": "'Açık Görevler'",
    "'Standup'": "'Standup'",
    "'Profile'": "'Profil'",

    # Profile.jsx Ranks
    "'Novice'": "'Çaylak'",
    "'Apprentice'": "'Çırak'",
    "'Contributor'": "'Katkıda Bulunan'",
    "'Senior'": "'Kıdemli'",
    "'Expert'": "'Uzman'",
    "'Elite'": "'Elit'",

    # Profile.jsx Badges
    "'First Task'": "'İlk Görev'",
    "'Task Master'": "'Görev Ustası'",
    "'Communicator'": "'İletişimci'",
    "'Streak'": "'Seri'",
    
    # Analytics.jsx
    "'Task Completion'": "'Görev Tamamlama'",
    "'Inactive Members'": "'Aktif Olmayan Üyeler'",
    "'Recent Blockers'": "'Son Engeller'",
    "'Inactive Volunteers'": "'Aktif Olmayan Gönüllüler'",
    "'Everyone is active!'": "'Herkes aktif!'",
    "'14+ days no activity'": "'14+ gündür aktivite yok'",
    "'tasks'": "'görev'",

    # App.jsx Admin UI
    "Create Committee": "Komite Oluştur",
    "Committee Name": "Komite Adı",
    "Chat ID": "Sohbet ID",
    "Cancel": "İptal",
    "Create": "Oluştur",
    "Add Member": "Üye Ekle",
    "Select User": "Kullanıcı Seç",
    "Select Committee": "Komite Seç",
    "Role": "Rol",
    "member": "üye",
    "leader": "lider",
    "admin": "yönetici",
    "Add": "Ekle",
    "Edit Committee": "Komiteyi Düzenle",
    "Save Changes": "Değişiklikleri Kaydet",
    "Create Task": "Görev Oluştur",
    "Title": "Başlık",
    "Description (optional)": "Açıklama (isteğe bağlı)",
    "Points": "Puan",
    "Assign To (optional)": "Ata (isteğe bağlı)",
    "Anyone (Available)": "Herhangi biri (Açık)",
    "Are you sure you want to delete": "Silmek istediğinize emin misiniz",
    "Broadcast Message": "Toplu Mesaj Gönder",
    "Message": "Mesaj",
    "Target": "Hedef",
    "All Users": "Tüm Kullanıcılar",
    "Send Broadcast": "Gönder",
    "Close": "Kapat",
    
    # MemberPortal.jsx User UI
    "Claim Task": "Görevi Al",
    "Mark as Done": "Tamamla",
    "Pending": "Bekliyor",
    "In Progress": "Devam Ediyor",
    "Completed": "Tamamlandı",
    "Cancelled": "İptal Edildi",
    "Submit Standup": "Standup Gönder",
    "What did you complete this week?": "Bu hafta neleri tamamladın?",
    "What will you work on next?": "Sırada ne var?",
    "Any blockers?": "Herhangi bir engel var mı?",
    "Submit": "Gönder",
    "points": "puan",
    "Unassigned": "Atanmamış",

    # bot.ts
    "Task already claimed or not found": "Görev zaten alınmış veya bulunamadı",
    "Task Claimed": "Görev Alındı",
    "You are now assigned to this task. Tap 'Mark as Done' when finished to earn": "Bu göreve atandınız. Bitirdiğinizde puan kazanmak için 'Tamamlandı Olarak İşaretle'ye tıklayın",
    "Task could not be completed": "Görev tamamlanamadı",
    "Task Completed": "Görev Tamamlandı",
    "Great job! You earned": "Harika iş! Kazandığınız puan:",

    # keyboards/index.ts
    "I'm Done": "Bitirdim",
    "Claim Task": "Görevi Al",
    "Mark as Done": "Tamamlandı Olarak İşaretle",
    "Start Standup": "Standup'a Başla",
    "No blockers": "Engel yok",

    # app.ts (DMs)
    "An admin has assigned you a new task": "Bir yönetici size yeni bir görev atadı",
    "You will earn": "Kazanacağınız puan:",
    "upon completion": "tamamlandığında",
    "New Task Available": "Yeni Görev Eklendi",
    "Earn": "Kazan",
    "by completing this": "tamamlayarak",
    
    # cron.ts
    "Standup Time": "Standup Zamanı",
    "It's time for your weekly update. Tap the button below to share what you've been working on.": "Haftalık güncelleme zamanı geldi. Üzerinde çalıştığınız konuları paylaşmak için aşağıdaki butona dokunun.",
    "This only takes a minute!": "Bu sadece bir dakikanızı alacak!",
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
    'webapp/src/App.jsx',
    'webapp/src/MemberPortal.jsx',
    'webapp/src/Profile.jsx',
    'webapp/src/Analytics.jsx',
    'api/app.ts',
    'api/cron.ts',
    'src/bot.ts',
    'src/keyboards/index.ts',
    'src/conversations/standup.ts',
    'src/conversations/admin_add_committee.ts',
    'src/conversations/admin_promote.ts',
    'src/features/start.ts',
    'src/features/help.ts',
    'src/features/tasks.ts',
    'src/features/done.ts',
    'src/features/leaderboard.ts',
    'src/features/admin.ts'
]

for f in files_to_process:
    process_file(f)
