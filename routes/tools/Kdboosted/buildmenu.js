const express = require('express')
const router = express.Router();

router.get('/', async (req, res) => {
    res.status(200).send(menus);
});

const menus = {
    main: `    var ui = SpreadsheetApp.getUi();
    ui.createMenu('🚀 Keyword Dominator')
        .addItem('🔎 𝗡𝗘𝗪 𝗥𝗘𝗦𝗘𝗔𝗥𝗖𝗛 𝗦𝗘𝗦𝗦𝗜𝗢𝗡', 'labels')
        .addItem('1) Choose Top 10 ASINs', 'openamzsearch')
        .addItem('2) Download New Data', 'openAllUrls')
        .addItem('3) Import Data into Keyword Dominator', 'importUserSelections_new')
        .addSubMenu(ui.createMenu('4) Add Keywords to Target List')
            .addItem('𝗠𝗬 𝗞𝗘𝗬𝗪𝗢𝗥𝗗 𝗦𝗢𝗨𝗥𝗖𝗘𝗦', 'gotosources')
            .addSubMenu(ui.createMenu('Helium10')
                .addItem('A) Add Cerebro Keywords', 'crToSource')
                .addItem('B) Add Alpha ASINs', 'alphaTowizard_CR')
            )
            .addSubMenu(ui.createMenu('ZonGuru')
                .addItem('A) Add KOF Keywords', 'zgToSource')
                .addItem('B) Add Alpha ASINs', 'alphaTowizard_ZG')
            )
            .addSubMenu(ui.createMenu('Jungle Scout')
                .addItem('A) Add Keyword Scout', 'jsToSource')
                .addItem('B) Add Alpha ASINs', 'alphaTowizard_JS')
            )
            .addSeparator()
            .addItem('➕ Add Manual Keywords', 'manualAdd')
        )
        .addSeparator()
        .addSubMenu(ui.createMenu('🔑 Filter KW Source Tables')
            .addItem('Cerebro', 'filterCR')
            .addItem('Zonguru', 'filterZG')
            .addItem('Brand Analytics', 'filterBA')
            .addItem('Opportunity Explorer', 'filterOE')
            .addItem('Search Query Report', 'filterSQR')
            .addItem('Custom List', 'filterCustom')
            .addItem('Magnet', 'filterMG')
            .addItem('Jungle Scout', 'filterJS')
            .addItem('Sellerise', 'filterSR')
        )
        .addSubMenu(ui.createMenu('🔍 Search Term Optimizer')
            .addItem('A) Process Phrase List', 'concatPhrases')
            .addItem('B) Optimize Search Terms', 'dedupePhrase')
        )
        .addSubMenu(ui.createMenu('🎯 KW List Operations')
            .addItem('▶️ Run Bulk Action', 'actionPane')
            .addItem('❌ Reset Filters', 'filterlistingwizard')
            .addItem('🔍 Priority + SV Sort', 'searchvolsort')
            .addItem('⚠️ Refresh Flag Terms', 'updateflags')
            .addItem('#️⃣ KW Frequency', 'singlewordlist')
            .addItem('📢 List Popular Brands', 'buildbrandlist')
            .addItem('🔐 Lookup Hidden Search Terms', 'opensearchtermurls')

            .addSubMenu(ui.createMenu('... Other Listing Wizard Tools')
                .addItem('Compare ASINs', 'productsViewer')
                .addItem('View Selected Preset', 'researchmode')
                .addItem('Send Words to Flag List', 'appendIrrelivantTerms')
                .addItem('Export Flag List', 'exportRemoveList')
            )
        )
        .addSeparator()
        .addItem('🔁 Refresh Listing Wizard', 'refreshallnew')
        .addItem('🔁 Sync Search Query Commander', 'syncFormulas')
        .addToUi();`,
    sop: `var ui = SpreadsheetApp.getUi();
    ui.createMenu('🎓 Training & Support')
        .addItem('Download the Quickstart Guide', 'openguide')
        .addItem('Watch the Quickstart Video', 'sop_quickstartpop')
        .addSeparator()
        .addItem('📞 Schedule Free 30min Onboaring Call', 'openfreecall')
        .addItem('❓ 𝗘𝗺𝗮𝗶𝗹 𝘀𝘂𝗽𝗽𝗼𝗿𝘁@𝗳𝗯𝗮𝗲𝘅𝗰𝗲𝗹.𝗶𝗼 𝘄𝗶𝘁𝗵 𝗮𝗻𝘆 𝘁𝗲𝗰𝗵 𝗶𝘀𝘀𝘂𝗲𝘀', 'labels')
        .addToUi()`
}

module.exports = router;