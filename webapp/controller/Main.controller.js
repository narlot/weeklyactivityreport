sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("activity.weekly.controller.Main", {
        onInit() {
            const oModel = this.getOwnerComponent().getModel();
            oModel.setUseBatch(false);

            const imageModel = this.getOwnerComponent().getModel("c4codataapi");
            imageModel.setUseBatch(false);
            imageModel.read(`/VisitCollection('0A31A588BAB91FD09CB9A50EEC254B6A')/VisitAttachment('0A31A588BAB91FD09CD8ECF753942BB2')`, {
                success: function (oData, response) {
                    const collection = new JSONModel(oData);
                    collection.setSizeLimit(6000);
                    this.getView().setModel(collection, "ImageModel");

                }.bind(this),
                error: function (oError) {
                    console.error(`Error loading image ${JSON.stringify(oError)}`);
                }
            });

        },

        onImagePress: function (oEvent) {
            const sSrc = oEvent.getSource().getSrc();

            if (!this._oImageDialog) {
                this._oImageDialog = new sap.m.Dialog({
                    title: "Full-size Image",
                    contentWidth: "auto",
                    contentHeight: "auto",
                    resizable: true,
                    draggable: true,
                    content: [
                        new sap.m.Image({
                            src: sSrc,
                            width: "100%",
                            height: "100%"
                        })
                    ],
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: function () {
                            this._oImageDialog.close();
                        }.bind(this)
                    })
                });
            } else {
                this._oImageDialog.getContent()[0].setSrc(sSrc);
            }

            this._oImageDialog.open();
        }
    });
});