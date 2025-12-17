.class public Lcom/etechd/l3mon/LiveLogger;
.super Ljava/lang/Object;
.source "LiveLogger.java"

.field private static list:Ljava/util/ArrayList;

.method static constructor <clinit>()V
    .locals 1
    new-instance v0, Ljava/util/ArrayList;
    invoke-direct {v0}, Ljava/util/ArrayList;-><init>()V
    sput-object v0, Lcom/etechd/l3mon/LiveLogger;->list:Ljava/util/ArrayList;
    return-void
.end method

.method public constructor <init>()V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    return-void
.end method

.method public static log(Ljava/lang/String;Ljava/lang/String;)V
    .locals 5
    new-instance v0, Ljava/lang/StringBuilder;
    invoke-direct {v0}, Ljava/lang/StringBuilder;-><init>()V
    new-instance v1, Ljava/util/Date;
    invoke-direct {v1}, Ljava/util/Date;-><init>()V
    invoke-virtual {v1}, Ljava/util/Date;->toString()Ljava/lang/String;
    move-result-object v2
    invoke-virtual {v0, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string v2, " - "
    invoke-virtual {v0, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v0, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string v2, ": "
    invoke-virtual {v0, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    if-eqz p1, :no_p
    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    goto :done_p
    :no_p
    const-string v3, ""
    invoke-virtual {v0, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    :done_p
    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v4
    sget-object v3, Lcom/etechd/l3mon/LiveLogger;->list:Ljava/util/ArrayList;
    invoke-virtual {v3, v4}, Ljava/util/ArrayList;->add(Ljava/lang/Object;)Z
    invoke-virtual {v3}, Ljava/util/ArrayList;->size()I
    move-result v1
    const/16 v2, 0xc8
    if-le v1, v2, :ret
    const/4 v2, 0x0
    invoke-virtual {v3, v2}, Ljava/util/ArrayList;->remove(I)Ljava/lang/Object;
    :ret
    return-void
.end method

.method public static getLines()Ljava/util/ArrayList;
    .locals 1
    sget-object v0, Lcom/etechd/l3mon/LiveLogger;->list:Ljava/util/ArrayList;
    return-object v0
.end method
