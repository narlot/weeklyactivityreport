// https://port8080-workspaces-ws-uo5t0.us10.applicationstudio.cloud.sap/test/flp.html?sap-ui-xx-viewCache=false#app-preview
// https://toto-usa-interfaces-non-prod-ikxl2m07.launchpad.cfapps.us10.hana.ondemand.com/7c500db2-f94d-4f54-9924-c7e3aaabbc57.activityweekly.activityweekly-0.0.1/index.html?#?&employeeid=21
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "activity/weekly/tools/utils",
    "sap/m/MessageToast"
], (Controller, JSONModel, utils, MessageToast) => {
    "use strict";

    return Controller.extend("activity.weekly.controller.Main", {

        async _initialize(employeeid) {
            this.getView().byId("WeeklyActivityID").setBusy(true);

            const oModel = this.getOwnerComponent().getModel();
            oModel.setUseBatch(false);

            const c4codataapiModel = this.getOwnerComponent().getModel("c4codataapi");
            c4codataapiModel.setUseBatch(false);

            // Start: Get Employees you need to present data for.
            let employees;
            if (typeof employeeid === "string") {
                employees = await this._getEmployees(c4codataapiModel, employeeid, this);
                this.getOwnerComponent().employees = employees;
            }
            // End: Get Employees you need to present data for.

            // Start: Weekly Activities
            const weeklyActivity = await this._getWeeklyActivity(oModel, employees);

            const uniqueWeeks = [...new Set(weeklyActivity.map(item => utils.getWeekEnd(item.CDOC_CREATIONDT)))];
            const war = uniqueWeeks.map(week => ({
                key: week,
                text: week
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
                o.WeekEnding = utils.getWeekEnd(o.CDOC_CREATIONDT);
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

        _getWeeklyActivity: function (oModel, employees) {

            let urlParameters = {
                "$select": "CAPA_DOC_UUID,TAPA_PTY_MAINACTIVITYPTY,Ts1ANsBFEACD52FCDD795,TAPA_PTY_MAINEMPLRESPPTY_N,Ts1ANsDFE1FAA8A417519,CDOC_NOTES,Ts1ANsEE730D1E08E7B3B,TAPA_DOC_UUID,CDOC_CREATIONDT",
            };

            if (employees) {
                const { saturday, friday } = this._getDateThreshold();
                urlParameters["$filter"] = `CDOC_CREATIONDT ge datetime'${saturday}' and CDOC_CREATIONDT le datetime'${friday}'`;
            }

            if (Array.isArray(this.getOwnerComponent().employees) && this.getOwnerComponent().employees.length > 0) {
                const employeeIDs = this.getOwnerComponent().employees.map(id => `CAPA_PTY_MAINEMPLRESPPTY_N eq '${id}'`).join(" or ");

                if (urlParameters["$filter"]) {
                    urlParameters["$filter"] += `and (${employeeIDs})`;
                } else {
                    urlParameters["$filter"] = employeeIDs;
                }

            }

            return new Promise((resolve, reject) => {
                oModel.read("/RPZ7B32F78E06B31CCE82FB26QueryResults", {
                    urlParameters,
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

        _getVisitObjectIDs: async function (uniqueWarIDs, oModel) {
            const chunkSize = 300;
            const chunks = [];

            for (let i = 0; i < uniqueWarIDs.length; i += chunkSize) {
                chunks.push(uniqueWarIDs.slice(i, i + chunkSize));
            }

            const results = await Promise.all(
                chunks.map(ids => new Promise((resolve, reject) => {
                    const filterString = ids.map(id => `ID eq '${id}'`).join(" or ");
                    oModel.read("/VisitCollection", {
                        urlParameters: {
                            "$filter": filterString
                        },
                        success: function (oData) {
                            const map = {};
                            oData.results.forEach(item => {
                                map[item.ID] = item.ObjectID;
                            });
                            resolve(ids.map(id => (
                                {
                                    ID: id,
                                    ObjectID: map[id] || null
                                })));
                        },
                        error: reject
                    });
                }))
            );

            return results.flat();
        },

        _getSurveyResponseIDs: async function (visitObjectIDs, oModel) {
            const chunkSize = 300;
            const chunks = [];
            for (let i = 0; i < visitObjectIDs.length; i += chunkSize) {
                chunks.push(visitObjectIDs.slice(i, i + chunkSize));
            }

            const results = await Promise.all(
                chunks.map(ids => new Promise((resolve, reject) => {
                    const filterString = ids
                        .map(item => `BusinessTransactionDocumentUUID eq '${item.ObjectID}'`)
                        .join(" or ");

                    oModel.read("/SurveyResponseCollection", {
                        urlParameters: { "$filter": filterString },
                        success: function (oData) {
                            const map = {};
                            oData.results.forEach(item => {
                                map[item.BusinessTransactionDocumentUUID] = item.ObjectID;
                            });

                            const mapped = ids.map(id => ({
                                ID: id.ID,
                                SurveyResponseObjectID: map[id.ObjectID] || null
                            }));

                            resolve(mapped);
                        },
                        error: function (oError) {
                            console.error("Error fetching SurveyResponses:", oError);
                            resolve(ids.map(id => ({
                                ID: id.ID,
                                SurveyResponseObjectID: null
                            })));
                        }
                    });
                }))
            );

            return results.flat().filter(r => r.SurveyResponseObjectID);
        },

        _getSurveyResponseItemIDs: async function (surveyResponseIDs, oModel) {
            const validIDs = surveyResponseIDs.filter(id => id.SurveyResponseObjectID);
            if (validIDs.length === 0) return [];

            const fetchItem = id => {
                return new Promise(resolve => {
                    oModel.read(`/SurveyResponseCollection('${id.SurveyResponseObjectID}')/SurveyResponseItem`, {
                        success: function (oData) {
                            if (oData.results?.length > 0) {
                                resolve({
                                    ID: id.ID,
                                    ItemObjectID: oData.results[0].ObjectID
                                });
                            } else {
                                resolve(null);
                            }
                        },
                        error: function (oError) {
                            console.error("Error fetching Survey Response Item:", id, oError);
                            resolve(null);
                        }
                    });
                });
            };

            const MAX_CONCURRENT = 5;
            const results = [];
            for (let i = 0; i < validIDs.length; i += MAX_CONCURRENT) {
                const batch = validIDs.slice(i, i + MAX_CONCURRENT);
                const batchResults = await Promise.all(batch.map(fetchItem));
                results.push(...batchResults.filter(Boolean));
            }

            return results;
        },

        _getDocumentLinks: async function (visitObjects, c4codataapiModel, weeklyActivity) {
            const validVisits = visitObjects.filter(v => v.ItemObjectID);
            if (validVisits.length === 0) return weeklyActivity;

            const fetchAttachments = (visit) => {
                return new Promise(resolve => {
                    c4codataapiModel.read(`/SurveyResponseItemCollection('${visit.ItemObjectID}')/SurveyResponseItemAttachments`, {
                        success: function (oData) {
                            const relatedActivities = weeklyActivity.filter(act => act.CAPA_DOC_UUID === visit.ID);

                            if (relatedActivities.length > 0) {
                                const links = oData.results.map(r => ({
                                    mimeType: r.MimeType,
                                    binary: r.Binary,
                                    link: r.DocumentLink
                                }));

                                const original = relatedActivities[0];
                                const startIndex = weeklyActivity.indexOf(original);

                                while (relatedActivities.length < links.length) {
                                    const clone = { ...original };
                                    relatedActivities.push(clone);
                                    weeklyActivity.splice(startIndex + relatedActivities.length - 1, 0, clone);
                                }

                                relatedActivities.forEach((act, index) => {
                                    if (links[index]) {
                                        act.DocumentLink = `data:${links[index].mimeType};base64,${links[index].binary}` || "";
                                        act.Link = links[index].link || "";
                                    }
                                });
                            }
                            resolve();
                        },
                        error: function (oError) {
                            console.error("Error fetching SurveyResponseItemAttachments for ItemObjectID:", visit.ItemObjectID, oError);
                            resolve();
                        }
                    });
                });
            };

            const MAX_CONCURRENT = 5;
            for (let i = 0; i < validVisits.length; i += MAX_CONCURRENT) {
                const batch = validVisits.slice(i, i + MAX_CONCURRENT);
                await Promise.all(batch.map(fetchAttachments));
            }

            return weeklyActivity;
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

        },

        _getDateThreshold: function () {
            const now = new Date();
            const day = now.getDay();

            const saturday = new Date(now);
            saturday.setDate(now.getDate() - ((day + 1) % 7));
            saturday.setHours(0, 0, 0, 0);

            const friday = new Date(saturday);
            friday.setDate(saturday.getDate() + 6);
            friday.setHours(23, 59, 59, 999);

            return {
                saturday: saturday.toISOString().slice(0, 19),
                friday: friday.toISOString().slice(0, 19)
            }
        },

        _getEmployees: async function (c4codataapiModel, employeeid, that) {
            const i18n = that.getOwnerComponent().getModel("i18n").getResourceBundle();
            
            const orgUnitID = await new Promise((resolve, reject) => {
                c4codataapiModel.read("/EmployeeCollection", {
                    urlParameters: {
                        "$filter": `EmployeeID eq '${employeeid}'`,
                        "$expand": "EmployeeOrganisationalUnitAssignment",
                        "$select": "EmployeeOrganisationalUnitAssignment/OrgUnitID"
                    },
                    success: function (oData) {
                        if (oData.results?.length > 0) {
                            const emp = oData.results[0];
                            const orgUnitID = emp.EmployeeOrganisationalUnitAssignment.map(oid => oid.OrgUnitID);
                            resolve({
                                employeeOrgUnitID: orgUnitID
                            });
                        } else {
                            that.getView().byId("WeeklyActivityID").setBusy(false);
                            that.getView().byId("BtnAllDataID").setEnabled(false);
                            MessageToast.show(i18n.getText("noUserIdentified"));
                            setTimeout(() => {
                                reject(`No employee found for ID: ${employeeid}`);
                            }, 3000);
                        }
                    },
                    error: function (oError) {
                        console.error("Error fetching expanded employee data:", oError);
                        that.getView().byId("WeeklyActivityID").setBusy(false);
                        that.getView().byId("BtnAllDataID").setEnabled(false);
                        MessageToast.show(i18n.getText("noUserIdentified"));
                        setTimeout(() => {
                            reject(oError);
                        }, 3000);
                    }
                });
            });

            const filter = orgUnitID.employeeOrgUnitID.map(oid => `OrganisationalUnitID eq '${oid}'`).join(" or ");
            return new Promise(resolve => {
                c4codataapiModel.read(`/OrganisationalUnitEmployeeAssignmentCollection`, {
                    urlParameters: {
                        "$filter": filter,
                        "$select": "EmployeeID"
                    },
                    success: function (oData) {
                        resolve(oData.results.map(e => e.EmployeeID));
                    },
                    error: function (oError) {
                        console.error(`Error Employee ID for orgUnit: ${orgUnitID.employeeOrgUnitID}`, oError);
                        resolve(null);
                    }
                });
            });

        }

    });
});