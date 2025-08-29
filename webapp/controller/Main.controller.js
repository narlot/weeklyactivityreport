sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("activity.weekly.controller.Main", {
        onInit() {
            const oModel = this.getOwnerComponent().getModel();
            oModel.setUseBatch(false);
            oModel.read("/RPZ3A90C9E0326509CA61E521QueryResults", {
                urlParameters: {
                    "$select": "CAPA_DOC_UUID,TAPA_PTY_MAINACTIVITYPTY,Ts1ANsBFEACD52FCDD795,TAPA_PTY_MAINEMPLRESPPTY_N,Ts1ANsDFE1FAA8A417519,CDOC_NOTES,Ts1ANsEE730D1E08E7B3B,CQRE_VAL_ATTACHMENT_UUID,TAPA_DOC_UUID,TDOC_REP_YR_WEEK"
                },
                success: function (oData) {
                    const oCollection = new JSONModel(oData.results);
                    oCollection.setSizeLimit(6000);
                    console.log(oCollection);
                },
                error: function (oError) {
                    console.error("Error fetching data:", oError);
                }
            });

            // Then: https://my366483.crm.ondemand.com/sap/c4c/odata/v1/c4codataapi/VisitCollection?$filter=ID eq '45' 
            // 45 is CAPA_DOC_UUID
            // Then we take ObjectID = 0A31A588BAB91FD09CB9A50EEC254B6A and go to 
            // https://my366483.crm.ondemand.com/sap/c4c/odata/v1/c4codataapi/VisitCollection('0A31A588BAB91FD09CB9A50EEC254B6A')/VisitAttachment
            // we take DocumentLink

            // const imageModel = this.getOwnerComponent().getModel("c4codataapi");
            // imageModel.setUseBatch(false);
            // imageModel.read(`/VisitCollection('0A31A588BAB91FD09CB9A50EEC254B6A')/VisitAttachment('0A31A588BAB91FD09CD8ECF753942BB2')`, {
            //     success: function (oData, response) {
            //         const collection = new JSONModel(oData);
            //         collection.setSizeLimit(6000);
            //         this.getView().setModel(collection, "ImageModel");

            //     }.bind(this),
            //     error: function (oError) {
            //         console.error(`Error loading image ${JSON.stringify(oError)}`);
            //     }
            // });

            const oTable = this.byId("WeeklyActivityTable");
            const aSticky = oTable.getSticky() || [];
            aSticky.push("ColumnHeaders");
            oTable.setSticky(aSticky);

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