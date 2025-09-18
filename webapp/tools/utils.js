sap.ui.define([], function () {
    "use strict";

    return {
        warToCSV: function (data, that) {
            const i18n = that.getOwnerComponent().getModel("i18n").getResourceBundle();
            const columnMap = {
                "CDOC_REP_YR_WEEK": i18n.getText("weekCalendarYear"),
                "Ts1ANsDFE1FAA8A417519": i18n.getText("mainProductCategories"),
                "TAPA_DOC_UUID": i18n.getText("visit"),
                "TAPA_PTY_MAINEMPLRESPP": i18n.getText("employeeResponsible"),
                "TAPA_PTY_MAINACTIVITYP": i18n.getText("account"),
                "CDOC_NOTES": i18n.getText("notes"),
                "Link": i18n.getText("image"),
                "Ts1ANsBFEACD52FCDD795": i18n.getText("activityDetails"),
                "Ts1ANsEE730D1E08E7B3B": i18n.getText("purpose"),
            };

            // Build CSV string
            const headers = Object.values(columnMap).join(",");
            const rows = data.map(item =>
                Object.keys(columnMap).map(key => `"${item[key] || ""}"`).join(",")
            );
            const csvContent = [headers, ...rows].join("\r\n");

            // Trigger download
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "WeeklyActivity.csv";
            link.click();
        }

    }

});