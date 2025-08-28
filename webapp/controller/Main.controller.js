sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("activity.weekly.controller.Main", {
        onInit() {
            const oModel = this.getOwnerComponent().getModel();
            oModel.setUseBatch(false);
            oModel.read(`/RPZ3A90C9E0326509CA61E521QueryResults`,
                {
                    success: function (oData, response) {
                        const collection = new JSONModel(oData.results);
                        collection.setSizeLimit(1000000);
                        this.getView().setModel(collection, "WeeklyActivity");
                        console.log(this.getView().getModel("WeeklyActivity").getData());

                    }.bind(this),
                    error: function (oError) {
                        console.error(`Error loading data: ${oError}`);
                    }
                });
        }
    });
});