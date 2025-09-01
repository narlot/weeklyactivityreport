sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("activity.weekly.controller.Main", {
        async onInit() {
            const oModel = this.getOwnerComponent().getModel();
            oModel.setUseBatch(false);

            const c4codataapiModel = this.getOwnerComponent().getModel("c4codataapi");
            c4codataapiModel.setUseBatch(false);

            // Start: Weekly Activities
            const weeklyActivity = await this._getWeeklyActivity(oModel);
            // End: Weekly Activities

            // Start: Keep Unique values only
            const uniqueWeeklyActivity = this._getUniqueActivities(weeklyActivity);
            // End: Keep Unique values only

            // Start: Get ObjectID
            const objectIDs = await this._getUniqueObjectIDs(uniqueWeeklyActivity, c4codataapiModel);
            // End: Get ObjectID

            // Start: Get Document Links
            const documentLinks = await this._getDocumentLinks(objectIDs, c4codataapiModel, weeklyActivity);
            // End: Get Document Links

            // Start: Set Model
            const oCollection = new sap.ui.model.json.JSONModel();
            oCollection.setSizeLimit(6000);
            oCollection.setData(documentLinks);
            this.getView().setModel(oCollection, "WeeklyActivity");
            // End: Set Model

            // Start: Freeze the top row
            const oTable = this.byId("WeeklyActivityTable");
            const aSticky = oTable.getSticky() || [];
            aSticky.push("ColumnHeaders");
            oTable.setSticky(aSticky);
            // End: Freeze the top row

        },

        _getDocumentLinks: function (visitObjects, c4codataapiModel, weeklyActivity) {
            const promises = visitObjects.map(visit => {
                const objectId = visit.ObjectID;
                const visitId = visit.ID || visit.CAPA_DOC_UUID; // Ensure we have the ID to match weeklyActivity

                return new Promise((resolve, reject) => {
                    c4codataapiModel.read(`/VisitCollection('${objectId}')/VisitAttachment`, {
                        success: function (oData) {
                            const visitWithImage = weeklyActivity.filter(vwi => vwi.CAPA_DOC_UUID == visitId);

                            if (visitWithImage.length > 0) {
                                visitWithImage.forEach(item => {
                                    item.DocumentLink = oData.results.length > 0 ? oData.results[0].DocumentLink : "";
                                });
                            }

                            resolve();
                        },
                        error: function (oError) {
                            console.error("Error fetching data from VisitAttachments:", oError);
                            resolve();
                        }
                    });
                });
            });

            return Promise.all(promises).then(() => weeklyActivity);
        },

        _getWeeklyActivity: function (oModel) {
            return new Promise((resolve, reject) => {
                oModel.read("/RPZ3A90C9E0326509CA61E521QueryResults", {
                    urlParameters: {
                        "$select": "CAPA_DOC_UUID,TAPA_PTY_MAINACTIVITYPTY,Ts1ANsBFEACD52FCDD795,TAPA_PTY_MAINEMPLRESPPTY_N,Ts1ANsDFE1FAA8A417519,CDOC_NOTES,Ts1ANsEE730D1E08E7B3B,CQRE_VAL_ATTACHMENT_UUID,TAPA_DOC_UUID,TDOC_REP_YR_WEEK"
                    },
                    success: function (oData) {
                        resolve(oData.results);
                    },
                    error: function (oError) {
                        console.error("Error fetching data from Weekly Activity:", oError);
                        reject(oError);
                    }
                });
            });
        },

        _getUniqueObjectIDs: function (uniqueWeeklyActivity, c4codataapiModel) {
            const promises = uniqueWeeklyActivity.map(activity => {
                const visitId = activity.CAPA_DOC_UUID;
                return new Promise((resolve, reject) => {
                    c4codataapiModel.read("/VisitCollection", {
                        urlParameters: {
                            "$filter": `ID eq '${visitId}'`
                        },
                        success: function (oData) {
                            resolve(oData.results);
                        },
                        error: function (oError) {
                            console.error("Error fetching data from Visit:", oError);
                            reject(oError);
                        }
                    });
                });
            });

            return Promise.all(promises).then(results => results.flat());
        },

        _getUniqueActivities: function (weeklyActivity) {
            const seen = new Set();
            return weeklyActivity.filter(item => {
                const key = item.CAPA_DOC_UUID;
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
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