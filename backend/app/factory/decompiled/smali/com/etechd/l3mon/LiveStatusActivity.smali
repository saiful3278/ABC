.class public Lcom/etechd/l3mon/LiveStatusActivity;
.super Landroid/app/Activity;
.source "LiveStatusActivity.java"

.method public constructor <init>()V
    .locals 0
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 2
    .param p1, "savedInstanceState"    # Landroid/os/Bundle;
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V
    sget v0, Lcom/etechd/l3mon/R$layout;->activity_live_status:I
    invoke-virtual {p0, v0}, Lcom/etechd/l3mon/LiveStatusActivity;->setContentView(I)V
    invoke-virtual {p0}, Lcom/etechd/l3mon/LiveStatusActivity;->refresh()V
    return-void
.end method

.method public refresh()V
    .locals 6
    sget v0, Lcom/etechd/l3mon/R$id;->statusView:I
    invoke-virtual {p0, v0}, Lcom/etechd/l3mon/LiveStatusActivity;->findViewById(I)Landroid/view/View;
    move-result-object v1
    check-cast v1, Landroid/widget/TextView;
    invoke-static {}, Lcom/etechd/l3mon/LiveLogger;->getLines()Ljava/util/ArrayList;
    move-result-object v2
    new-instance v3, Ljava/lang/StringBuilder;
    invoke-direct {v3}, Ljava/lang/StringBuilder;-><init>()V
    invoke-virtual {v2}, Ljava/util/ArrayList;->iterator()Ljava/util/Iterator;
    move-result-object v4
    :loop
    invoke-interface {v4}, Ljava/util/Iterator;->hasNext()Z
    move-result v0
    if-eqz v0, :done
    invoke-interface {v4}, Ljava/util/Iterator;->next()Ljava/lang/Object;
    move-result-object v0
    check-cast v0, Ljava/lang/String;
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string v5, "\n"
    invoke-virtual {v3, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    goto :loop
    :done
    invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v0
    invoke-virtual {v1, v0}, Landroid/widget/TextView;->setText(Ljava/lang/CharSequence;)V
    return-void
.end method

.method public onStartClick(Landroid/view/View;)V
    .locals 1
    const-string v0, "start"
    invoke-static {v0}, Lcom/etechd/l3mon/ConnectionManager;->SP(Ljava/lang/String;)V
    const-string v0, "requested"
    invoke-static {v0, v0}, Lcom/etechd/l3mon/LiveLogger;->log(Ljava/lang/String;Ljava/lang/String;)V
    invoke-virtual {p0}, Lcom/etechd/l3mon/LiveStatusActivity;->refresh()V
    return-void
.end method

.method public onStopClick(Landroid/view/View;)V
    .locals 1
    const-string v0, "stop"
    invoke-static {v0}, Lcom/etechd/l3mon/ConnectionManager;->SP(Ljava/lang/String;)V
    const-string v0, "stopping"
    invoke-static {v0, v0}, Lcom/etechd/l3mon/LiveLogger;->log(Ljava/lang/String;Ljava/lang/String;)V
    invoke-virtual {p0}, Lcom/etechd/l3mon/LiveStatusActivity;->refresh()V
    return-void
.end method
