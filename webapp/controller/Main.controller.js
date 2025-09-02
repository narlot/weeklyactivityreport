sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("activity.weekly.controller.Main", {

        async _initialize() {
            const c4codataapiModel = this.getOwnerComponent().getModel("c4codataapi");
            c4codataapiModel.setUseBatch(false);
            const that = this;
            c4codataapiModel.read("/SurveyResponseItemCollection('0A31A588BAB91FD09CB9584115C68B69')/SurveyResponseItemAttachments('0A9D4C6001F11FD09E93421EE9E6726F')", {
                success: function (oData) {
                    const imageSrc = `data:${oData.MimeType};base64,${oData.Binary}`;
                    const oWeeklyActivityModel = new JSONModel({
                        WeeklyActivity: [
                            {
                                ID: "Waka",
                                DocumentLink: imageSrc
                            }
                        ]
                    });
                    that.getView().setModel(oWeeklyActivityModel, "WeeklyActivity");
                },
                error: function (oError) {
                    console.error("Error fetching Images:", oError);
                }
            });
        },

        onInit() {
            this._initialize();
        }

    });
});