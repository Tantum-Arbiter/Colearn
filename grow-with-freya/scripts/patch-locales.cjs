const fs = require('fs');
const path = require('path');

const locales = ['ar','da','de','es','fr','it','ja','la','nl','pl','pt','tr','zh'];

// For each locale, we need to add keys in specific sections.
// We'll do this by finding the right insertion points in each file.

function addAfterLine(content, searchStr, newLine) {
  const idx = content.indexOf(searchStr);
  if (idx === -1) return null;
  const endOfLine = content.indexOf('\n', idx);
  return content.substring(0, endOfLine + 1) + newLine + '\n' + content.substring(endOfLine + 1);
}

function addBeforeClosingBrace(content, sectionStart, newLines) {
  // Find the section, then find its closing brace
  const idx = content.indexOf(sectionStart);
  if (idx === -1) return null;
  // Find matching closing brace - count braces
  let braceCount = 0;
  let i = content.indexOf('{', idx);
  for (; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') braceCount--;
    if (braceCount === 0) break;
  }
  // i is the position of the closing brace
  return content.substring(0, i) + newLines + '\n' + content.substring(i);
}

const t = JSON.parse(fs.readFileSync('/tmp/missing-translations.json', 'utf8'));

for (const loc of locales) {
  const filePath = path.join(__dirname, '..', 'locales', loc, 'index.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // 1. common.openSettings - add after "off:" line in common section
  if (!content.includes('openSettings')) {
    const offLine = content.match(/\s+off:\s*'.+',?\n/);
    if (offLine) {
      const idx = content.indexOf(offLine[0]);
      const endIdx = idx + offLine[0].length;
      content = content.substring(0, endIdx) + "    openSettings: '" + t['common.openSettings'][loc] + "',\n" + content.substring(endIdx);
      changes++;
    }
  }

  // 2. screenTime.overLimit - add after "excessive:" line
  if (!content.includes('overLimit')) {
    const excessiveLine = content.match(/\s+excessive:\s*'.+',?\n/);
    if (excessiveLine) {
      const idx = content.indexOf(excessiveLine[0]);
      const endIdx = idx + excessiveLine[0].length;
      content = content.substring(0, endIdx) + "    overLimit: '" + t['screenTime.overLimit'][loc] + "',\n" + content.substring(endIdx);
      changes++;
    }
  }

  // 3. reminders.permissionRequired - add before the closing of reminders section
  if (!content.includes('permissionRequired')) {
    // Find a line we know is near the end of reminders, like "noRemindersHint"
    const noRemHint = content.match(/\s+noRemindersHint:\s*'.+',?\n/);
    if (noRemHint) {
      const idx = content.indexOf(noRemHint[0]);
      const endIdx = idx + noRemHint[0].length;
      const block = "    permissionRequired: {\n" +
        "      title: '" + t['reminders.permissionRequired.title'][loc] + "',\n" +
        "      message: '" + t['reminders.permissionRequired.message'][loc].replace(/'/g, "\\'") + "',\n" +
        "    },\n";
      content = content.substring(0, endIdx) + block + content.substring(endIdx);
      changes++;
    }
  }

  // 4. tutorial.mainMenu.instruments + learning - add after freeplay section in tutorial.mainMenu
  if (!content.includes("instruments: {\n") || !content.match(/tutorial[\s\S]*mainMenu[\s\S]*instruments/)) {
    // Find the freeplay closing brace in tutorial.mainMenu
    const freeplayMatch = content.match(/freeplay:\s*\{[^}]+\},?\n/);
    if (freeplayMatch) {
      const idx = content.indexOf(freeplayMatch[0]);
      const endIdx = idx + freeplayMatch[0].length;
      const block = "      instruments: {\n" +
        "        title: '" + t['tutorial.mainMenu.instruments.title'][loc] + "',\n" +
        "        description: '" + t['tutorial.mainMenu.instruments.description'][loc].replace(/'/g, "\\'") + "',\n" +
        "      },\n" +
        "      learning: {\n" +
        "        title: '" + t['tutorial.mainMenu.learning.title'][loc] + "',\n" +
        "        description: '" + t['tutorial.mainMenu.learning.description'][loc].replace(/'/g, "\\'") + "',\n" +
        "      },\n";
      content = content.substring(0, endIdx) + block + content.substring(endIdx);
      changes++;
    }
  }

  // 5. subscription error/restore keys - add before the closing of subscription section
  if (!content.includes('errorTitle')) {
    // Find signInRequiredCancel line
    const cancelLine = content.match(/\s+signInRequiredCancel:\s*'.+',?\n/);
    if (cancelLine) {
      const idx = content.indexOf(cancelLine[0]);
      const endIdx = idx + cancelLine[0].length;
      const block = "    // Purchase flow\n" +
        "    errorTitle: '" + t['subscription.errorTitle'][loc] + "',\n" +
        "    errorUnavailable: '" + t['subscription.errorUnavailable'][loc].replace(/'/g, "\\'") + "',\n" +
        "    errorGeneric: '" + t['subscription.errorGeneric'][loc].replace(/'/g, "\\'") + "',\n" +
        "    // Restore purchases\n" +
        "    restorePurchases: '" + (loc === 'ar' ? 'استعادة المشتريات' : loc === 'da' ? 'Gendan Køb' : loc === 'de' ? 'Käufe Wiederherstellen' : loc === 'es' ? 'Restaurar Compras' : loc === 'fr' ? 'Restaurer les Achats' : loc === 'it' ? 'Ripristina Acquisti' : loc === 'ja' ? '購入を復元' : loc === 'la' ? 'Emptiones Restaura' : loc === 'nl' ? 'Aankopen Herstellen' : loc === 'pl' ? 'Przywróć Zakupy' : loc === 'pt' ? 'Restaurar Compras' : loc === 'tr' ? 'Satın Alımları Geri Yükle' : loc === 'zh' ? '恢复购买' : 'Restore Purchases') + "',\n" +
        "    restoreSuccessTitle: '" + (loc === 'ar' ? 'تم استعادة المشتريات' : loc === 'da' ? 'Køb Gendannet' : loc === 'de' ? 'Käufe Wiederhergestellt' : loc === 'es' ? 'Compras Restauradas' : loc === 'fr' ? 'Achats Restaurés' : loc === 'it' ? 'Acquisti Ripristinati' : loc === 'ja' ? '購入を復元しました' : loc === 'la' ? 'Emptiones Restauratae' : loc === 'nl' ? 'Aankopen Hersteld' : loc === 'pl' ? 'Zakupy Przywrócone' : loc === 'pt' ? 'Compras Restauradas' : loc === 'tr' ? 'Satın Alımlar Geri Yüklendi' : loc === 'zh' ? '购买已恢复' : 'Purchases Restored') + "',\n" +
        "    restoreSuccessMessage: '" + (loc === 'ar' ? 'تم استعادة اشتراكك بنجاح.' : loc === 'da' ? 'Dit abonnement er blevet gendannet.' : loc === 'de' ? 'Ihr Abonnement wurde erfolgreich wiederhergestellt.' : loc === 'es' ? 'Tu suscripción se ha restaurado correctamente.' : loc === 'fr' ? 'Votre abonnement a été restauré avec succès.' : loc === 'it' ? 'Il tuo abbonamento è stato ripristinato con successo.' : loc === 'ja' ? 'サブスクリプションが正常に復元されました。' : loc === 'la' ? 'Subscriptio tua prospere restaurata est.' : loc === 'nl' ? 'Je abonnement is succesvol hersteld.' : loc === 'pl' ? 'Twoja subskrypcja została pomyślnie przywrócona.' : loc === 'pt' ? 'Sua assinatura foi restaurada com sucesso.' : loc === 'tr' ? 'Aboneliğiniz başarıyla geri yüklendi.' : loc === 'zh' ? '您的订阅已成功恢复。' : 'Your subscription has been restored successfully.') + "',\n" +
        "    restoreNoneTitle: '" + (loc === 'ar' ? 'لم يتم العثور على مشتريات' : loc === 'da' ? 'Ingen Køb Fundet' : loc === 'de' ? 'Keine Käufe Gefunden' : loc === 'es' ? 'No Se Encontraron Compras' : loc === 'fr' ? 'Aucun Achat Trouvé' : loc === 'it' ? 'Nessun Acquisto Trovato' : loc === 'ja' ? '購入が見つかりません' : loc === 'la' ? 'Nullae Emptiones Inventae' : loc === 'nl' ? 'Geen Aankopen Gevonden' : loc === 'pl' ? 'Nie Znaleziono Zakupów' : loc === 'pt' ? 'Nenhuma Compra Encontrada' : loc === 'tr' ? 'Satın Alım Bulunamadı' : loc === 'zh' ? '未找到购买记录' : 'No Purchases Found') + "',\n" +
        "    restoreNoneMessage: '" + (loc === 'ar' ? 'لم نتمكن من العثور على أي مشتريات سابقة لاستعادتها.' : loc === 'da' ? 'Vi kunne ikke finde nogen tidligere køb at gendanne.' : loc === 'de' ? 'Wir konnten keine früheren Käufe zum Wiederherstellen finden.' : loc === 'es' ? 'No pudimos encontrar compras anteriores para restaurar.' : loc === 'fr' ? 'Nous n\\'avons trouvé aucun achat précédent à restaurer.' : loc === 'it' ? 'Non siamo riusciti a trovare acquisti precedenti da ripristinare.' : loc === 'ja' ? '復元する以前の購入が見つかりませんでした。' : loc === 'la' ? 'Nullas emptiones priores ad restaurandum invenire potuimus.' : loc === 'nl' ? 'We konden geen eerdere aankopen vinden om te herstellen.' : loc === 'pl' ? 'Nie udało się znaleźć poprzednich zakupów do przywrócenia.' : loc === 'pt' ? 'Não conseguimos encontrar compras anteriores para restaurar.' : loc === 'tr' ? 'Geri yüklenecek önceki satın alım bulunamadı.' : loc === 'zh' ? '未找到可恢复的购买记录。' : 'We couldn\\'t find any previous purchases to restore.') + "',\n";
      content = content.substring(0, endIdx) + block + content.substring(endIdx);
      changes++;
    }
  }

  fs.writeFileSync(filePath, content);
  console.log(loc + ': ' + changes + ' sections added');
}
