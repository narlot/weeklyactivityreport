// https://port8080-workspaces-ws-uo5t0.us10.applicationstudio.cloud.sap/test/flp.html?sap-ui-xx-viewCache=false#app-preview
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "activity/weekly/tools/utils",
    "sap/m/MessageToast"
], (Controller, JSONModel, utils, MessageToast) => {
    "use strict";

    return Controller.extend("activity.weekly.controller.Main", {

        async _initialize(employeeid) {

            const oModel = this.getOwnerComponent().getModel();
            oModel.setUseBatch(false);

            const c4codataapiModel = this.getOwnerComponent().getModel("c4codataapi");
            c4codataapiModel.setUseBatch(false);

            // Start: Weekly Activities
            const weeklyActivity = await this._getWeeklyActivity(oModel);

            const uniqueWeeks = [...new Set(weeklyActivity.map(item => item.CDOC_REP_YR_WEEK))];
            const war = uniqueWeeks.map(week => ({
                key: utils.getWeekEnd(week),
                text: utils.getWeekEnd(week)
            }));
            const uniqueWeeksWAR = new JSONModel(war);
            uniqueWeeksWAR.setSizeLimit(6000);
            this.getView().setModel(uniqueWeeksWAR, "WarWeeks");

            const uniqueWeeksWARBackUp = new JSONModel();
            uniqueWeeksWARBackUp.setSizeLimit(6000);
            uniqueWeeksWARBackUp.setData(war);
            this.getView().setModel(uniqueWeeksWARBackUp, "WarWeeksBackup");

            const uniqueYears = [...new Set(war.map(item => item.key.split("/")[2]))];
            const result = uniqueYears.map(year => ({ key: year, text: year }));
            this.getView().setModel(new JSONModel(result), "WarYears");
            // End: Weekly Activities

            // Start: Keep Unique values only
            const uniqueWeeklyActivity = this._getUniqueActivities(weeklyActivity);
            // End: Keep Unique values only

            // Start: Visit Object IDs
            const visitObjectIDs = await this._getVisitObjectIDs(uniqueWeeklyActivity, c4codataapiModel);
            // End: Visit Object IDs

            // Start: Survey Response IDs
            const surveyResponseIDs = await this._getSurveyResponseIDs(visitObjectIDs, c4codataapiModel);
            // End: Survey Response IDs

            // Start: Survey Response Items' IDs
            const surveyItemsIDs = await this._getSurveyResponseItemIDs(surveyResponseIDs, c4codataapiModel);
            // End: Survey Response Items' IDs

            // Start: Get Document Links
            const documentLinks = await this._getDocumentLinks(surveyItemsIDs, c4codataapiModel, weeklyActivity);
            // End: Get Document Links

            documentLinks.forEach((o) => {
                o.WeekEnding = utils.getWeekEnd(o.CDOC_REP_YR_WEEK);
            });

            // Start: Set Model
            const oCollection = new JSONModel();
            oCollection.setSizeLimit(6000);
            oCollection.setData(documentLinks);
            this.getView().setModel(oCollection, "WeeklyActivity");

            const oCollectionBackUp = new JSONModel();
            oCollectionBackUp.setSizeLimit(6000);
            oCollectionBackUp.setData(documentLinks);
            this.getView().setModel(oCollectionBackUp, "WeeklyActivityBackup");
            // End: Set Model

            // Start: Freeze the top row
            const oTable = this.byId("WeeklyActivityTable");
            const aSticky = oTable.getSticky() || [];
            aSticky.push("ColumnHeaders");
            oTable.setSticky(aSticky);
            // End: Freeze the top row

            this.getView().byId("WeeklyActivityID").setBusy(false);
        },

        onInit() {
            const router = this.getOwnerComponent().getRouter();
            router.getRoute("RouteMain").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            const oArgs = oEvent.getParameter("arguments");
            if (oArgs && oArgs["?query"]) {
                const employeeid = oArgs["?query"].employeeid;

                if (employeeid) {
                    this._initialize(employeeid);
                } else {
                    const i18n = that.getOwnerComponent().getModel("i18n").getResourceBundle();
                    MessageToast.show(i18n.getText("noUserIdentified"));
                }

            }
        },

        _getWeeklyActivity: function (oModel) {
            return new Promise((resolve, reject) => {
                oModel.read("/RPZ3A90C9E0326509CA61E521QueryResults", {
                    urlParameters: {
                        "$select": "CAPA_DOC_UUID,TAPA_PTY_MAINACTIVITYPTY,Ts1ANsBFEACD52FCDD795,TAPA_PTY_MAINEMPLRESPPTY_N,Ts1ANsDFE1FAA8A417519,CDOC_NOTES,Ts1ANsEE730D1E08E7B3B,CQRE_VAL_ATTACHMENT_UUID,TAPA_DOC_UUID,CDOC_REP_YR_WEEK"
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

        _getUniqueActivities: function (weeklyActivity) {
            const seen = new Set();
            return weeklyActivity
                .filter(item => {
                    if (seen.has(item.CAPA_DOC_UUID)) {
                        return false;
                    }
                    seen.add(item.CAPA_DOC_UUID);
                    return true;
                })
                .map(item => item.CAPA_DOC_UUID);
        },

        _getVisitObjectIDs: function (uniqueWarIDs, oModel) {
            const promises = uniqueWarIDs.map(id => {
                return new Promise((resolve) => {
                    oModel.read("/VisitCollection", {
                        urlParameters: {
                            "$filter": `ID eq '${id}'`
                        },
                        success: function (oData) {
                            if (oData.results && oData.results.length > 0) {
                                resolve({
                                    ID: id,
                                    ObjectID: oData.results[0].ObjectID
                                });
                            } else {
                                resolve({
                                    ID: id,
                                    ObjectID: null
                                });
                            }
                        },
                        error: function (oError) {
                            console.error("Error fetching Visit with ID:", id, oError);
                            resolve({
                                ID: id,
                                ObjectID: null
                            });
                        }
                    });
                });
            });

            return Promise.all(promises).then(results => results.filter(item => item.ObjectID));
        },

        _getSurveyResponseIDs: function (visitObjectIDs, oModel) {
            const promises = visitObjectIDs.map(item => {
                return new Promise((resolve) => {
                    oModel.read("/SurveyResponseCollection", {
                        urlParameters: {
                            "$filter": `BusinessTransactionDocumentUUID eq '${item.ObjectID}'`
                        },
                        success: function (oData) {
                            if (oData.results && oData.results.length > 0) {
                                resolve({
                                    ID: item.ID,
                                    SurveyResponseObjectID: oData.results[0].ObjectID
                                });
                            } else {
                                resolve({
                                    ID: item.ID,
                                    SurveyResponseObjectID: null
                                });
                            }
                        },
                        error: function (oError) {
                            console.error("Error fetching Survey Response for Visit ObjectID:", item.ObjectID, oError);
                            resolve({
                                ID: item.ID,
                                VisitObjectID: item.ObjectID,
                                SurveyResponseObjectID: null
                            });
                        }
                    });
                });
            });

            return Promise.all(promises).then(results => results.filter(r => r.SurveyResponseObjectID));
        },

        _getSurveyResponseItemIDs: function (surveyResponseIDs, oModel) {
            const promises = surveyResponseIDs.map(id => {
                return new Promise((resolve, reject) => {
                    oModel.read(`/SurveyResponseCollection('${id.SurveyResponseObjectID}')/SurveyResponseItem`, {
                        success: function (oData) {
                            if (oData.results && oData.results.length > 0) {
                                resolve({
                                    ID: id.ID,
                                    ItemObjectID: oData.results[0].ObjectID
                                });
                            } else {
                                resolve({
                                    ID: id.ID,
                                    ItemObjectID: null
                                });
                            }
                        },
                        error: function (oError) {
                            console.error("Error fetching Survey Response Items with ID:", id, oError);
                            resolve(null);
                        }
                    });
                });
            });

            return Promise.all(promises).then(results => results.filter(Boolean));
        },

        _getDocumentLinks: function (visitObjects, c4codataapiModel, weeklyActivity) {
            const promises = visitObjects.map(obj => {
                const itemObjectId = obj.ItemObjectID;
                const visitId = obj.ID;

                return new Promise((resolve) => {
                    c4codataapiModel.read(`/SurveyResponseItemCollection('${itemObjectId}')/SurveyResponseItemAttachments`, {
                        success: function (oData) {
                            const relatedActivities = weeklyActivity.filter(act => act.CAPA_DOC_UUID == visitId);

                            if (relatedActivities.length > 0) {
                                let links = oData.results.map(r => {

                                    return {
                                        mimeType: r.MimeType,
                                        binary: r.Binary,
                                        link: r.DocumentLink
                                    }
                                });
                                relatedActivities.forEach((act, index) => {
                                    if (links[index]) {
                                        act.DocumentLink = `data:${links[index].mimeType};base64,${links[index].binary}` || "";
                                        act.Link = links[index].link;
                                    }
                                });
                            }
                            resolve();
                        },
                        error: function (oError) {
                            console.error("Error fetching SurveyResponseItemAttachments for ItemObjectID:", itemObjectId, oError);
                            resolve();
                        }
                    });
                });
            });

            return Promise.all(promises).then(() => weeklyActivity);
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
        },

        _warReset: function () {
            const warOriginal = this.getView().getModel("WeeklyActivity");
            const warBackUp = this.getView().getModel("WeeklyActivityBackup").getData();

            warOriginal.setData(warBackUp);
            warOriginal.refresh();
        },

        warFiler: function (oEvent) {
            const warFilter = this.byId("mcbWeekCalendarYearID");
            const warFileritems = warFilter.getSelectedKeys();

            const warYearFilter = this.byId("mcbCalendarYearID");
            const warYearFilterItems = warYearFilter.getSelectedKeys();

            if (warFileritems.length == 0 && warYearFilterItems.length == 0) {
                this._warReset();
                return;
            } else if (warFileritems.length > 0) {
                this._warReset();
                const warOriginal = this.getView().getModel("WeeklyActivity");
                const warOriginalData = warOriginal.getData();
                const filteredData = warOriginalData.filter(item => warFileritems.includes(item.WeekEnding));
                warOriginal.setData(filteredData);
                warOriginal.refresh();
            } else if (warYearFilterItems.length > 0) {
                this._warReset();
                const warOriginal = this.getView().getModel("WeeklyActivity");
                const warOriginalData = warOriginal.getData();
                const filteredData = warOriginalData.filter(item => {
                    if (!item.WeekEnding) return false;
                    const year = item.WeekEnding.split("/")[2];
                    return warYearFilterItems.includes(year);
                });
                warOriginal.setData(filteredData);
                warOriginal.refresh();
            }

        },

        onMenuAction: function (oEvent) {
            const oItem = oEvent.getParameter("item").getText();

            if (!oItem) {
                return;
            }

            const warOriginal = this.getView().getModel("WeeklyActivity");

            if (!warOriginal) {
                return;
            }

            const warOriginalData = warOriginal.getData();

            switch (oItem) {
                case "Excel": {
                    utils.warToExcel(this);
                    break;
                }
                case "CSV": {
                    utils.warToCSV(warOriginalData, this);
                    break;
                }
                case "PDF": {
                    utils.warToPDF(warOriginalData, this);
                    break;
                }
            }
        },

        setYear: function (oEvent) {
            const selectedYears = oEvent.getSource().getSelectedItems();
            const warWeeks = this.getView().getModel("WarWeeks");

            if (!warWeeks) {
                return;
            }

            const warWeeksData = warWeeks.getData();

            const result = warWeeksData.filter(item => {
                const year = item.key.split("/")[2].trim();
                return selectedYears
                    .map(y => y.getKey().toString().trim())
                    .includes(year);
            });

            if (result.length != 0) {
                warWeeks.setData(result);
                warWeeks.refresh();
            } else {
                const warWeeksBackup = this.getView().getModel("WarWeeksBackup");
                const warWeeksDataBackup = warWeeksBackup.getData();
                warWeeks.setData(warWeeksDataBackup);
                warWeeks.refresh();
            }

        }

    });
});