sap.ui.define([
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "sap/ui/core/format/DateFormat"
], function (Spreadsheet, exportLibrary, DateFormat) {
    "use strict";

    const EdmType = exportLibrary.EdmType;

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
        },

        warToExcel: function (that) {
            const oTable = that.getView().byId("WeeklyActivityTable");
            const oRowBinding = oTable.getBinding("items");
            const aCols = this._createColumn(that);

            const oSettings = {
                workbook: {
                    columns: aCols
                },
                dataSource: oRowBinding,
                fileName: "WeeklyActivity"
            }

            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });

        },

        _createColumn: function (that) {
            const i18n = that.getOwnerComponent().getModel("i18n").getResourceBundle();

            const aCols = [];

            aCols.push({
                label: i18n.getText("weekCalendarYear"),
                property: "CDOC_REP_YR_WEEK",
                type: EdmType.String
            });

            aCols.push({
                label: i18n.getText("mainProductCategories"),
                property: "Ts1ANsDFE1FAA8A417519",
                type: EdmType.String
            });

            aCols.push({
                label: i18n.getText("visit"),
                property: "TAPA_DOC_UUID",
                type: EdmType.String
            });

            aCols.push({
                label: i18n.getText("employeeResponsible"),
                property: "TAPA_PTY_MAINEMPLRESPP",
                type: EdmType.String
            });

            aCols.push({
                label: i18n.getText("account"),
                property: "CDOC_NOTES",
                type: EdmType.String
            });

            aCols.push({
                label: i18n.getText("notes"),
                property: "CDOC_REP_YR_WEEK",
                type: EdmType.String
            });

            aCols.push({
                label: i18n.getText("image"),
                property: "Link",
                type: EdmType.String
            });

            aCols.push({
                label: i18n.getText("activityDetails"),
                property: "Ts1ANsBFEACD52FCDD795",
                type: EdmType.String
            });

            aCols.push({
                label: i18n.getText("purpose"),
                property: "Ts1ANsEE730D1E08E7B3B",
                type: EdmType.String
            });

            return aCols;

        },

        getWeekEnd: function (weekCalendarYear) {
            const [weekStr, yearStr] = weekCalendarYear.split("/");
            const week = parseInt(weekStr, 10);
            const year = parseInt(yearStr, 10);

            // Jan 4 is always in week 1 (ISO)
            const jan4 = new Date(year, 0, 4);

            // Calculate Monday of that week
            const day = jan4.getDay(); // 0=Sun...6=Sat
            const mondayOfWeek1 = new Date(jan4);
            // Shift backwards to Monday
            mondayOfWeek1.setDate(jan4.getDate() - ((day + 6) % 7));

            // Monday of target week
            const targetMonday = new Date(mondayOfWeek1);
            targetMonday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);

            // Friday = Monday + 4
            const friday = new Date(targetMonday);
            friday.setDate(targetMonday.getDate() + 4 + 7);

            const oDateFormat = DateFormat.getDateInstance({
                pattern: "dd/MM/yyyy"
            });

            return oDateFormat.format(friday);

        },

        warToPDF: function (data, that) {
            that.byId("ExportButtonId").setBusy(true);

            const xmlData = this._buildXMLData(data, that);

            fetch(`v1/forms/WAR`, {
                method: "GET"
            })
                .then(response => response.json())
                .then(function (json) {
                    fetch(`v1/adsRender/pdf`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            "xdpTemplate": json.templates[0].xdpTemplate,
                            "xmlData": xmlData,
                            "formType": "print",
                            "formLocale": "en_US",
                            "taggedPdf": 1,
                            "embedFont": 0,
                            "changeNotAllowed": false,
                            "printNotAllowed": false,
                            "useCustomLocale": false
                        })
                    }).then(response => response.json())
                        .then(function (json) {
                            const base64 = json.fileContent.replace(/\s/g, '');
                            const binaryString = atob(base64);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }

                            const blob = new Blob([bytes], { type: "application/pdf" });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "WeeklyActivity.pdf";
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(url);

                            that.byId("ExportButtonId").setBusy(false);
                        });

                });
        },

        _buildXMLData: function (data, that) {
            const xmlModel = that.getOwnerComponent().getModel("XMLSchema").getData();

            let xmlSchema = xmlModel.xmlRoot;
            xmlSchema += xmlModel.xmlFormStart;
            
            xmlSchema += xmlModel.xmlBodyMainStart;

            xmlSchema += xmlModel.xmlHeaderStart;
            xmlSchema += xmlModel.xmlWeekEndingStart;
            xmlSchema += this._getCurrentWeekEnding();
            xmlSchema += xmlModel.xmlWeekEndingEnd;
            xmlSchema += xmlModel.xmlHeaderEnd;

            xmlSchema += xmlModel.xmlItemSubformStart;

            let xmlBody = "";
            data.forEach(o => {
                const { __metadata, ...attrs } = o;

                xmlBody += xmlModel.xmlBodyItemStart;

                xmlModel.xmlBodyItemAttributes.sort((a, b) => a.seq - b.seq);
                xmlModel.xmlBodyItemAttributes.forEach(i => {
                    if (i.key == "Attachment" && attrs[i.value]) {
                        const binaryArray = attrs[i.value].split(",");
                        if (binaryArray.length > 0) {
                            xmlBody += `<${i.key}>${binaryArray[1]}</${i.key}>`;
                        }
                    } else if (attrs[i.value]) {
                        let cleansedValue = this._escapeSpecialCharsXML(attrs[i.value]);
                        cleansedValue = this._nonLatin(cleansedValue);
                        xmlBody += `<${i.key}>${cleansedValue}</${i.key}>`;
                    }
                });

                xmlBody += xmlModel.xmlBodyItemEnd;

            });

            if (xmlBody.length > 0) {
                xmlSchema += xmlBody;
                xmlSchema += xmlModel.xmlItemSubformEnd;
                xmlSchema += xmlModel.xmlBodyMainEnd;
                xmlSchema += xmlModel.xmlFormEnd;

                const xmlBase64 = btoa(xmlSchema);
                return xmlBase64;

            } else {
                return;
            }
        },

        _getCurrentWeekEnding: function () {
            const today = new Date();
            const day = today.getDay();
            let diff = 5 - day;
            if (day === 6) diff = -1;
            if (day === 0) diff = 5;

            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() + diff);

            return weekEnd.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            });

        },

        _escapeSpecialCharsXML: function (str) {
            if (typeof str !== 'string') return str;
            return str
                .replace(/&/g, '')
                .replace(/</g, '')
                .replace(/>/g, '')
                .replace(/"/g, '')
                .replace(/'/g, '')
                .trim();
        },

        _nonLatin: function (str) {
            const overrideChars = [
                "å", "æ", "ø", "à", "á", "â", "ä", "ã", "ā", "ą", "ă", "ǎ", "ç", "ĉ", "č", "ć", "Ch", "ð", "ď", "ǆ", "è", "é", "ê", "ë", "ę", "ē",
                "ĕ", "ė", "ě", "ĝ", "ğ", "ġ", "ģ", "ǧ", "ĥ", "ħ", "ì", "í", "î", "ï", "į", "ı", "ĩ", "ī", "ĭ", "ĵ", "ķ", "ǩ", "ĺ", "ļ", "ľ", "ŀ",
                "ł", "ń", "ņ", "ñ", "ň", "ò", "ó", "ô", "ö", "õ", "ő", "ǫ", "ō", "ŏ", "ơ", "ŕ", "ŗ", "ř", "ś", "ŝ", "ş", "ș", "š", "ß", "ŧ",
                "ţ", "ț", "þ", "ù", "ú", "û", "ü", "ũ", "ū", "ŭ", "ų", "ů", "ű", "ƿ", "ȝ", "ư", "ŵ", "ý", "ŷ", "ÿ", "ź", "ž", "ż"
            ];

            let lValue = str;
            for (let i = 0; i < overrideChars.length; i++) {
                const pattern = overrideChars[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const regExp = new RegExp(pattern, "g");
                lValue = lValue.replace(regExp, "");
            }

            return lValue;
        }

    }

});