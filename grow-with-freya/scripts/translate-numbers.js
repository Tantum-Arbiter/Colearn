#!/usr/bin/env node
/**
 * Translate numbers story content for all non-English locale files.
 * Format: S['storyKey'] = { locale: [title, page1, page2, page3, page4, page5] }
 * Usage: node scripts/translate-numbers.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const LOCALES = ['ar','da','de','es','fr','it','ja','la','nl','pl','pt','tr','zh'];
const FIELDS = ['title', 'page1', 'page2', 'page3', 'page4', 'page5'];
const LANG = {ar:'Arabic',da:'Danish',de:'German',es:'Spanish',fr:'French',it:'Italian',ja:'Japanese',la:'Latin',nl:'Dutch',pl:'Polish',pt:'Portuguese',tr:'Turkish',zh:'Chinese'};

const S = {};

// ═══ COUNTING-FUN (cf1–cf5) ═══

S['cf1'] = {
  ar: ['العد النجمي','انظر للأعلى! السماء بها ضوء ساطع. هل تستطيع تهجئة كم عددها؟','الآن ___ أخرى تظهر، وهي ___!','قيمة يد كاملة من الأصابع. هذا العدد من النجوم!','___ أخرى تلمع. حان وقت ___!','أربعة أضواء ساطعة تشكل شكل ماسة!'],
  da: ['Stjernetælling','Kig op! Himlen har et klart lys. Kan du stave hvor mange?','Nu dukker ___ flere op, og det er ___!','En hel hånds værdi af fingre. Så mange stjerner!','___ mere blinker. Tid til at ___!','Fire klare lys danner en diamantform!'],
  de: ['Sternenzählen','Schau hoch! Der Himmel hat ein helles Licht. Kannst du buchstabieren wie viele?','Jetzt erscheinen ___ mehr, und es sind ___!','Eine ganze Hand voll Finger. So viele Sterne!','___ mehr funkeln. Zeit zum ___!','Vier helle Lichter bilden eine Rautenform!'],
  es: ['Cuenta Estelar','¡Mira arriba! El cielo tiene una luz brillante. ¿Puedes deletrear cuántas hay?','¡Ahora aparecen ___ más, y son ___!','El valor de una mano entera de dedos. ¡Tantas estrellas!','___ más titilan. ¡Hora de ___!','¡Cuatro luces brillantes forman un diamante!'],
  fr: ['Compte Étoilé','Regarde en haut ! Le ciel a une lumière brillante. Peux-tu épeler combien il y en a ?','Maintenant ___ de plus apparaissent, et c\'est ___ !','La valeur d\'une main entière de doigts. Autant d\'étoiles !','___ de plus scintillent. C\'est l\'heure de ___ !','Quatre lumières brillantes forment un losange !'],
  it: ['Conto Stellare','Guarda in alto! Il cielo ha una luce brillante. Sai sillabare quante sono?','Ora ne appaiono ___ di più, e sono ___!','Il valore di una mano intera di dita. Tante stelle!','___ di più brillano. È ora di ___!','Quattro luci brillanti formano una forma di diamante!'],
  ja: ['ほしのかぞえ','みあげて！そらにあかるいひかりがあるよ。いくつあるかつづれるかな？','いま___つふえて、___になったよ！','てのゆびぜんぶぶん。それだけのほしがあるよ！','___つもっとひかる。___するじかんだよ！','よっつのあかるいひかりがひしがたをつくっているよ！'],
  la: ['Stellarum Numeratio','Sursum specta! Caelum lucem claram habet. Potesne numerare quot sint?','Nunc ___ plures apparent, et sunt ___!','Totius manus digitorum valor. Tot stellae!','___ plures micant. Tempus est ___!','Quattuor lucida lumina formam adamantis faciunt!'],
  nl: ['Sterrentelling','Kijk omhoog! De lucht heeft een helder licht. Kun je spellen hoeveel het er zijn?','Nu verschijnen er ___ meer, en het zijn er ___!','Een hele hand vol vingers. Zoveel sterren!','___ meer twinkelen. Tijd om te ___!','Vier heldere lichten vormen een ruitvorm!'],
  pl: ['Gwiazdowe Liczenie','Spójrz w górę! Niebo ma jasne światło. Czy potrafisz przeliterować ile ich jest?','Teraz pojawia się ___ więcej, i jest ich ___!','Wartość całej dłoni palców. Tyle gwiazd!','___ więcej miga. Czas na ___!','Cztery jasne światła tworzą kształt diamentu!'],
  pt: ['Contagem Estelar','Olhe para cima! O céu tem uma luz brilhante. Você sabe soletrar quantas são?','Agora ___ mais aparecem, e são ___!','O valor de uma mão inteira de dedos. Tantas estrelas!','___ mais brilham. Hora de ___!','Quatro luzes brilhantes formam um losango!'],
  tr: ['Yıldız Sayma','Yukarı bak! Gökyüzünde parlak bir ışık var. Kaç tane olduğunu heceleyebilir misin?','Şimdi ___ tane daha beliriyor ve ___!','Bir elin tüm parmakları kadar. O kadar çok yıldız!','___ tane daha parlıyor. ___ zamanı!','Dört parlak ışık bir elmas şekli oluşturuyor!'],
  zh: ['星星计数','抬头看！天空有一道明亮的光。你能拼写出有多少颗吗？','现在又出现了___颗，一共是___！','一只手所有手指的数量。那么多星星！','又有___颗闪烁。该___了！','四道明亮的光形成了菱形！'],
};

S['cf2'] = {
  ar: ['العد المشمس','الشمس طلعت! عُد الغيوم.','فقط ___ غيمة و___!','كثير من الغيوم! استخدم كل أصابعك.','الآن ___ و___ غيوم تطفو!','نصف دزينة من الغيوم ترقص في صف!'],
  da: ['Solskins-tælling','Solen er oppe! Tæl skyerne.','Bare ___ sky og ___!','Så mange skyer! Brug alle dine fingre.','Nu svæver ___ og ___ skyer forbi!','Et halvt dusin skyer danser på rad!'],
  de: ['Sonniges Zählen','Die Sonne ist da! Zähle die Wolken.','Nur ___ Wolke und die ___!','So viele Wolken! Benutze alle deine Finger.','Jetzt schweben ___ und ___ Wolken vorbei!','Ein halbes Dutzend Wolken tanzen in einer Reihe!'],
  es: ['Cuenta Soleada','¡El sol está arriba! Cuenta las nubes.','¡Solo ___ nube y el ___!','¡Tantas nubes! Usa todos tus dedos.','¡Ahora ___ y ___ nubes flotan!','¡Media docena de nubes bailan en fila!'],
  fr: ['Compte Ensoleillé','Le soleil est levé ! Compte les nuages.','Juste ___ nuage et le ___ !','Tant de nuages ! Utilise tous tes doigts.','Maintenant ___ et ___ nuages flottent !','Une demi-douzaine de nuages dansent en rang !'],
  it: ['Conto Soleggiato','Il sole è alto! Conta le nuvole.','Solo ___ nuvola e il ___!','Tante nuvole! Usa tutte le dita.','Ora ___ e ___ nuvole fluttuano!','Mezza dozzina di nuvole danzano in fila!'],
  ja: ['おひさまかぞえ','おひさまがでた！くもをかぞえよう。','___つのくもと___だけ！','たくさんのくも！ゆびをぜんぶつかって。','___と___のくもがうかんでいるよ！','はんダースのくもがならんでおどっているよ！'],
  la: ['Solaris Numeratio','Sol surrexit! Numera nubes.','Tantum ___ nubes et ___!','Tot nubes! Omnibus digitis utere.','Nunc ___ et ___ nubes volitant!','Sex nubes in ordine saltant!'],
  nl: ['Zonnige Telling','De zon is op! Tel de wolken.','Slechts ___ wolk en de ___!','Zoveel wolken! Gebruik al je vingers.','Nu zweven ___ en ___ wolken voorbij!','Een half dozijn wolken dansen op een rij!'],
  pl: ['Słoneczne Liczenie','Słońce wstało! Policz chmury.','Tylko ___ chmura i ___!','Tyle chmur! Użyj wszystkich palców.','Teraz ___ i ___ chmur płynie!','Pół tuzina chmur tańczy w rzędzie!'],
  pt: ['Contagem Ensolarada','O sol nasceu! Conte as nuvens.','Apenas ___ nuvem e o ___!','Tantas nuvens! Use todos os dedos.','Agora ___ e ___ nuvens flutuam!','Meia dúzia de nuvens dançam em fila!'],
  tr: ['Güneşli Sayma','Güneş doğdu! Bulutları say.','Sadece ___ bulut ve ___!','Çok fazla bulut! Tüm parmaklarını kullan.','Şimdi ___ ve ___ bulut süzülüyor!','Yarım düzine bulut sırada dans ediyor!'],
  zh: ['阳光计数','太阳升起来了！数数云朵。','只有___朵云和___！','好多云！用上你所有的手指。','现在___和___朵云飘过！','半打云朵排成一排跳舞！'],
};

S['cf3'] = {
  ar: ['عد قوس القزح','يظهر قوس قزح! دعونا نجمع الألوان.','___ خطوط و___ أخرى!','كل الألوان معاً تصنع مجموعاً!','___ أشرطة لونية، ثم ___!','خمسة ألوان جميلة تتألق بشكل أسطع!'],
  da: ['Regnbue-tælling','En regnbue dukker op! Lad os tælle farverne sammen.','___ striber og ___ mere!','Alle farverne sammen giver en sum!','___ farvebånd, så ___!','Fem smukke farver skinner klarest!'],
  de: ['Regenbogen-Zählen','Ein Regenbogen erscheint! Lass uns die Farben zusammenzählen.','___ Streifen und ___ mehr!','Alle Farben zusammen ergeben eine Summe!','___ Farbbänder, dann ___!','Fünf wunderschöne Farben leuchten am hellsten!'],
  es: ['Cuenta Arcoíris','¡Aparece un arcoíris! Sumemos los colores.','¡___ franjas y ___ más!','¡Todos los colores juntos hacen una suma!','¡___ bandas de color, luego ___!','¡Cinco colores hermosos brillan más fuerte!'],
  fr: ['Compte Arc-en-ciel','Un arc-en-ciel apparaît ! Additionnons les couleurs.','___ rayures et ___ de plus !','Toutes les couleurs ensemble font une somme !','___ bandes de couleur, puis ___ !','Cinq belles couleurs brillent le plus fort !'],
  it: ['Conto Arcobaleno','Appare un arcobaleno! Sommiamo i colori.','___ strisce e ___ di più!','Tutti i colori insieme fanno una somma!','___ bande di colore, poi ___!','Cinque bellissimi colori brillano di più!'],
  ja: ['にじのかぞえ','にじがあらわれた！いろをたしざんしよう。','___つのしまと___つふえた！','すべてのいろをあわせるとごうけいになるよ！','___つのいろのおび、そして___！','いつつのきれいないろがいちばんかがやいているよ！'],
  la: ['Arcus Numeratio','Arcus pluvius apparet! Colores addamus.','___ lineae et ___ plures!','Omnes colores simul summam faciunt!','___ fasciae colorum, deinde ___!','Quinque pulchri colores clarissime splendent!'],
  nl: ['Regenboogtelling','Een regenboog verschijnt! Laten we de kleuren optellen.','___ strepen en ___ meer!','Alle kleuren samen maken een som!','___ kleurenbanden, dan ___!','Vijf prachtige kleuren schijnen het helderst!'],
  pl: ['Tęczowe Liczenie','Pojawia się tęcza! Dodajmy kolory.','___ paski i ___ więcej!','Wszystkie kolory razem dają sumę!','___ pasm kolorów, potem ___!','Pięć pięknych kolorów świeci najjaśniej!'],
  pt: ['Contagem Arco-íris','Um arco-íris aparece! Vamos somar as cores.','___ faixas e ___ mais!','Todas as cores juntas fazem uma soma!','___ faixas de cor, depois ___!','Cinco cores lindas brilham mais forte!'],
  tr: ['Gökkuşağı Sayma','Bir gökkuşağı beliriyor! Renkleri toplayalım.','___ çizgi ve ___ daha!','Tüm renkler birlikte bir toplam yapıyor!','___ renk bandı, sonra ___!','Beş güzel renk en parlak şekilde parlıyor!'],
  zh: ['彩虹计数','彩虹出现了！让我们把颜色加起来。','___条纹和___条更多！','所有颜色加在一起等于一个总和！','___条色带，然后___！','五种美丽的颜色闪耀得最亮！'],
};

S['cf4'] = {
  ar: ['عد الحديقة','في الحديقة، نصف دزينة من الفراشات ترقص!','___ تمر طائرة، حان وقت ___!','يرقة وحيدة على الورقة.','___ أخرى تنضم، ___ يكبر!','كل عشرة أصابع تستطيع عد الأزهار!'],
  da: ['Have-tælling','I haven danser et halvt dusin sommerfugle!','___ flyver forbi, tid til at ___!','Bare én ensom larve på bladet.','___ flere slutter sig til, ___ vokser!','Alle ti fingre kan tælle blomsterne!'],
  de: ['Garten-Zählen','Im Garten tanzen ein halbes Dutzend Schmetterlinge!','___ flattern vorbei, Zeit zum ___!','Nur eine einsame Raupe auf dem Blatt.','___ mehr schließen sich an, ___ wächst!','Alle zehn Finger können die Blumen zählen!'],
  es: ['Cuenta del Jardín','¡En el jardín, media docena de mariposas bailan!','¡___ pasan volando, hora de ___!','Solo una oruga solitaria en la hoja.','¡___ más se unen, ___ crece!','¡Los diez dedos pueden contar las flores!'],
  fr: ['Compte du Jardin','Dans le jardin, une demi-douzaine de papillons dansent !','___ passent en volant, c\'est l\'heure de ___ !','Juste une chenille solitaire sur la feuille.','___ de plus rejoignent, le ___ grandit !','Les dix doigts peuvent compter les fleurs !'],
  it: ['Conto del Giardino','Nel giardino, mezza dozzina di farfalle danzano!','___ svolazzano, è ora di ___!','Solo un bruco solitario sulla foglia.','___ altri si uniscono, il ___ cresce!','Tutte dieci le dita possono contare i fiori!'],
  ja: ['おにわかぞえ','おにわで、はんダースのちょうちょがおどっているよ！','___ひきがとんでいく、___するじかんだよ！','はっぱにひとりぼっちのいもむし。','___びきがなかまになり、___がふえたよ！','じゅっぽんのゆびでおはなをかぞえよう！'],
  la: ['Horti Numeratio','In horto, sex papiliones saltant!','___ praetervolant, tempus est ___!','Una sola eruca in folio.','___ plures se iungunt, ___ crescit!','Omnes decem digiti flores numerare possunt!'],
  nl: ['Tuintelling','In de tuin dansen een half dozijn vlinders!','___ fladderen voorbij, tijd om te ___!','Slechts één eenzame rups op het blad.','___ meer sluiten zich aan, ___ groeit!','Alle tien vingers kunnen de bloemen tellen!'],
  pl: ['Liczenie w Ogrodzie','W ogrodzie tańczy pół tuzina motyli!','___ przelatują, czas na ___!','Tylko jedna samotna gąsienica na liściu.','___ więcej dołącza, ___ rośnie!','Wszystkie dziesięć palców może policzyć kwiaty!'],
  pt: ['Contagem do Jardim','No jardim, meia dúzia de borboletas dançam!','___ passam voando, hora de ___!','Apenas uma lagarta solitária na folha.','___ mais se juntam, ___ cresce!','Todos os dez dedos podem contar as flores!'],
  tr: ['Bahçe Sayma','Bahçede yarım düzine kelebek dans ediyor!','___ uçup geçiyor, ___ zamanı!','Yaprakta yalnız bir tırtıl.','___ tane daha katılıyor, ___ büyüyor!','On parmağın hepsi çiçekleri sayabilir!'],
  zh: ['花园计数','在花园里，半打蝴蝶在跳舞！','___只飞过，该___了！','叶子上只有一只孤独的毛毛虫。','___只加入，___在增长！','十根手指都能数花朵！'],
};

S['cf5'] = {
  ar: ['عد المحيط','أربع سمكات تسبح في الشعاب المرجانية!','___ أخرى تسبح، هذا ___!','زوج من فرسان البحر يمران.','فقط ___، ثم وقت ___!','الإجمالي وصل! عُدهم جميعاً!'],
  da: ['Havtælling','Fire fisk svømmer i koralrevet!','___ flere svømmer op, det er ___!','Et par søheste svømmer forbi.','Bare ___, så tid til at ___!','Totalen er klar! Tæl dem alle op!'],
  de: ['Ozean-Zählen','Vier Fische schwimmen im Korallenriff!','___ mehr schwimmen hoch, das sind ___!','Ein Paar Seepferdchen schwimmt vorbei.','Nur ___, dann Zeit zum ___!','Die Summe steht! Zähle sie alle zusammen!'],
  es: ['Cuenta del Océano','¡Cuatro peces nadan en el arrecife de coral!','¡___ más nadan, eso es ___!','Un par de caballitos de mar pasan.','¡Solo ___, luego hora de ___!','¡El total está aquí! ¡Cuéntalos todos!'],
  fr: ['Compte de l\'Océan','Quatre poissons nagent dans le récif corallien !','___ de plus nagent, c\'est ___ !','Une paire d\'hippocampes passe.','Juste ___, puis c\'est l\'heure de ___ !','Le total est là ! Comptez-les tous !'],
  it: ['Conto dell\'Oceano','Quattro pesci nuotano nella barriera corallina!','___ di più nuotano su, sono ___!','Un paio di cavallucci marini passano.','Solo ___, poi è ora di ___!','Il totale è arrivato! Contali tutti!'],
  ja: ['うみのかぞえ','よんひきのさかながさんごしょうでおよいでいるよ！','___びきふえて、___になったよ！','たつのおとしごのペアがとおりすぎるよ。','___だけ、そして___するじかんだよ！','ごうけいがでた！ぜんぶかぞえよう！'],
  la: ['Oceani Numeratio','Quattuor pisces in corallo natant!','___ plures sursum natant, sunt ___!','Par hippocamporum praeternatat.','Tantum ___, deinde tempus ___!','Summa adest! Omnes numera!'],
  nl: ['Oceaantelling','Vier vissen zwemmen in het koraalrif!','___ meer zwemmen omhoog, dat zijn er ___!','Een paar zeepaardjes zwemmen voorbij.','Slechts ___, dan tijd om te ___!','Het totaal is er! Tel ze allemaal op!'],
  pl: ['Liczenie Oceanu','Cztery ryby pływają w rafie koralowej!','___ więcej przypływa, to ___!','Para koników morskich przepływa obok.','Tylko ___, potem czas na ___!','Suma jest gotowa! Policz wszystkie!'],
  pt: ['Contagem do Oceano','Quatro peixes nadam no recife de coral!','___ mais nadam, são ___!','Um par de cavalos-marinhos passa.','Apenas ___, depois hora de ___!','O total chegou! Conte todos!'],
  tr: ['Okyanus Sayma','Dört balık mercan resifinde yüzüyor!','___ tane daha yüzüyor, bu ___!','Bir çift denizatı geçiyor.','Sadece ___, sonra ___ zamanı!','Toplam belli oldu! Hepsini say!'],
  zh: ['海洋计数','四条鱼在珊瑚礁里游泳！','又有___条游来，一共是___！','一对海马游过。','只有___，然后该___了！','总数出来了！把它们都数一遍！'],
};

// ═══ NUMBER-FRIENDS (nf1–nf5) ═══

S['nf1'] = {
  ar: ['أصدقاء الدب','دب صغير يجلس بجانب النهر.','___ أخرى تصل لـ___!','يا لها من مجموعة كبيرة من الأصدقاء!','كم من ___! الآن هناك ___!','نصف دزينة من الأصدقاء يتراشقون ويلعبون!'],
  da: ['Bjørnevenner','Én bjørneunge sidder ved floden.','___ flere ankommer til en ___!','Sikke en stor gruppe venner!','Så meget ___! Nu er der ___!','Et halvt dusin venner plasker og leger!'],
  de: ['Bärenfreunde','Ein Bärenjunges sitzt am Fluss.','___ mehr kommen zu einem ___!','Was für eine große Gruppe Freunde!','So viel ___! Jetzt gibt es ___!','Ein halbes Dutzend Freunde planschen und spielen!'],
  es: ['Amigos Osos','Un osito se sienta junto al río.','¡___ más llegan para un ___!','¡Qué gran grupo de amigos!','¡Tanto ___! ¡Ahora hay ___!','¡Media docena de amigos chapotean y juegan!'],
  fr: ['Amis Ours','Un ourson est assis au bord de la rivière.','___ de plus arrivent pour un ___ !','Quel grand groupe d\'amis !','Tant de ___ ! Maintenant il y en a ___ !','Une demi-douzaine d\'amis éclaboussent et jouent !'],
  it: ['Amici Orsi','Un orsetto siede vicino al fiume.','___ altri arrivano per un ___!','Che grande gruppo di amici!','Tanto ___! Ora ce ne sono ___!','Mezza dozzina di amici sguazzano e giocano!'],
  ja: ['くまのともだち','こぐまがかわのそばにすわっているよ。','___びきがやってきて___になったよ！','なんておおきなともだちのグループ！','たくさんの___！いまは___びきだよ！','はんダースのともだちがみずあそびをしているよ！'],
  la: ['Amici Ursi','Unus ursulus iuxta flumen sedet.','___ plures adveniunt ad ___!','Quam magnus amicorum grex!','Tantum ___! Nunc sunt ___!','Sex amici aquam spargunt et ludunt!'],
  nl: ['Berenvrienden','Eén beertje zit bij de rivier.','___ meer komen voor een ___!','Wat een grote groep vrienden!','Zoveel ___! Nu zijn er ___!','Een half dozijn vrienden plonzen en spelen!'],
  pl: ['Przyjaciele Misie','Jeden mały miś siedzi nad rzeką.','___ więcej przybywa na ___!','Co za duża grupa przyjaciół!','Tyle ___! Teraz jest ich ___!','Pół tuzina przyjaciół pluskuje się i bawi!'],
  pt: ['Amigos Ursos','Um filhote de urso senta junto ao rio.','___ mais chegam para um ___!','Que grande grupo de amigos!','Tanto ___! Agora são ___!','Meia dúzia de amigos chapinham e brincam!'],
  tr: ['Ayı Arkadaşlar','Bir ayı yavrusu nehir kenarında oturuyor.','___ tane daha ___ için geliyor!','Ne büyük bir arkadaş grubu!','Ne kadar çok ___! Şimdi ___ var!','Yarım düzine arkadaş su sıçratıp oynuyor!'],
  zh: ['小熊朋友','一只小熊坐在河边。','又来了___只，一起___！','好大一群朋友！','这么多___！现在有___只了！','半打朋友在泼水玩耍！'],
};

S['nf2'] = {
  ar: ['أصدقاء الجراء','جرو يرحب بالجميع ترحيباً حاراً!','فقط ___ جرو، لكنه ___!','وقت اللعب! الجميع يقضي وقتاً رائعاً.','عُد حتى ___. هذا ___ جراء!','خمسة ذيول تهتز في صف!'],
  da: ['Hvalpekammerater','En hvalp giver alle en varm velkomst!','Bare ___ hvalp, men så ___!','Legetid! Alle har det fantastisk.','Tæl til ___. Det er ___ hvalpe!','Fem logrehaler på rad!'],
  de: ['Welpenfreunde','Ein Welpe begrüßt alle herzlich!','Nur ___ Welpe, aber so ___!','Spielzeit! Alle haben eine wunderbare Zeit.','Zähle bis ___. Das sind ___ Welpen!','Fünf wedelnde Schwänze in einer Reihe!'],
  es: ['Amigos Cachorros','¡Un cachorro da la bienvenida a todos!','¡Solo ___ cachorro, pero tan ___!','¡Hora de jugar! Todos se divierten.','¡Cuenta hasta ___. ¡Son ___ cachorros!','¡Cinco colas moviéndose en fila!'],
  fr: ['Copains Chiots','Un chiot accueille tout le monde chaleureusement !','Juste ___ chiot, mais si ___ !','C\'est l\'heure de jouer ! Tout le monde s\'amuse.','Compte jusqu\'à ___. Ce sont ___ chiots !','Cinq queues qui remuent en rang !'],
  it: ['Amici Cuccioli','Un cucciolo dà il benvenuto a tutti!','Solo ___ cucciolo, ma così ___!','È ora di giocare! Tutti si divertono.','Conta fino a ___. Sono ___ cuccioli!','Cinque code che scodinzolano in fila!'],
  ja: ['こいぬのなかま','こいぬがみんなをあたたかくむかえるよ！','___ぴきだけだけど、とっても___！','あそぶじかん！みんなたのしんでいるよ。','___までかぞえて。___ぴきのこいぬだよ！','いつつのしっぽがならんでふっているよ！'],
  la: ['Catuli Amici','Catulus omnes calide salutat!','Tantum ___ catulus, sed tam ___!','Tempus ludendi! Omnes se bene habent.','Numera ad ___. Sunt ___ catuli!','Quinque caudae in ordine agitantur!'],
  nl: ['Puppyvriendjes','Een puppy verwelkomt iedereen hartelijk!','Slechts ___ puppy, maar zo ___!','Speeltijd! Iedereen heeft het geweldig.','Tel tot ___. Dat zijn ___ puppy\'s!','Vijf kwispelende staarten op een rij!'],
  pl: ['Szczeniaczki','Szczeniak wita wszystkich ciepło!','Tylko ___ szczeniak, ale tak ___!','Czas na zabawę! Wszyscy się świetnie bawią.','Policz do ___. To ___ szczeniaków!','Pięć merdających ogonków w rzędzie!'],
  pt: ['Amigos Filhotes','Um filhote dá as boas-vindas a todos!','Apenas ___ filhote, mas tão ___!','Hora de brincar! Todos se divertem.','Conte até ___. São ___ filhotes!','Cinco rabinhos abanando em fila!'],
  tr: ['Yavru Köpek Arkadaşlar','Bir yavru köpek herkesi sıcak karşılıyor!','Sadece ___ yavru, ama çok ___!','Oyun zamanı! Herkes harika vakit geçiriyor.','___\'e kadar say. Bu ___ yavru köpek!','Beş sallanan kuyruk sırada!'],
  zh: ['小狗朋友','一只小狗热情地欢迎大家！','只有___只小狗，但好___！','游戏时间！大家都玩得很开心。','数到___。一共___只小狗！','五条摇摆的尾巴排成一排！'],
};

S['nf3'] = {
  ar: ['نادي القطط','قطتان صغيرتان تطاردان كرة خيط.','يا لها من ___! زائد ___ تصبح حفلة!','كل عشر قطط في السلة!','___ دافئ. الكثير من ___ أصدقاء!','قطة صغيرة واحدة فقط بقيت على السجادة.'],
  da: ['Killingeklubben','To små killinger jagter et garnnøgle.','Sikke ___! Plus ___ bliver det en fest!','Alle ti killinger er i kurven!','Et varmt ___. Så mange ___ venner!','Bare én killing tilbage på måtten.'],
  de: ['Kätzchen-Klub','Zwei kleine Kätzchen jagen ein Wollknäuel.','So viel ___! Plus ___ wird es eine Party!','Alle zehn Kätzchen sind im Korb!','Ein warmes ___. So viele ___ Freunde!','Nur ein Kätzchen bleibt auf der Matte.'],
  es: ['Club de Gatitos','Dos gatitos persiguen una bola de hilo.','¡Qué ___! ¡Más ___ hacen una fiesta!','¡Los diez gatitos están en la cesta!','Un ___ cálido. ¡Tantos ___ amigos!','¡Solo un gatito queda en la alfombra!'],
  fr: ['Club des Chatons','Deux petits chatons chassent une pelote de laine.','Quelle ___ ! Plus ___ c\'est une fête !','Les dix chatons sont dans le panier !','Un ___ chaleureux. Tant d\'amis ___ !','Juste un chaton reste sur le tapis !'],
  it: ['Club dei Gattini','Due gattini rincorrono un gomitolo di lana.','Che ___! Più ___ diventa una festa!','Tutti dieci i gattini sono nel cestino!','Un ___ caldo. Tanti amici ___!','Solo un gattino è rimasto sul tappetino!'],
  ja: ['こねこクラブ','にひきのこねこがけいとのたまをおいかけているよ。','なんて___！___をたすとパーティーだよ！','じゅっぴきぜんぶのこねこがかごのなかにいるよ！','あたたかい___。たくさんの___なともだち！','いっぴきだけのこねこがマットにのこっているよ。'],
  la: ['Cattulorum Sodalicium','Duo cattuli pilam lani sequuntur.','Quam ___! Plus ___ est convivium!','Omnes decem cattuli in cista sunt!','Calidum ___. Tot amici ___!','Unus tantum cattulus in tapete manet.'],
  nl: ['Kattenclub','Twee kleine katjes achtervolgen een bolletje wol.','Wat een ___! Plus ___ wordt het een feestje!','Alle tien de katjes zitten in de mand!','Een warm ___. Zoveel ___ vriendjes!','Slechts één katje blijft op de mat.'],
  pl: ['Klub Kociąt','Dwa małe kocięta gonią kłębek włóczki.','Co za ___! Plus ___ to impreza!','Wszystkie dziesięć kociąt jest w koszyku!','Ciepłe ___. Tyle ___ przyjaciół!','Tylko jedno kociątko zostało na macie.'],
  pt: ['Clube dos Gatinhos','Dois gatinhos perseguem um novelo de lã.','Que ___! Mais ___ vira festa!','Todos os dez gatinhos estão na cesta!','Um ___ quentinho. Tantos amigos ___!','Apenas um gatinho ficou no tapete!'],
  tr: ['Kedi Yavrusu Kulübü','İki küçük kedi yavrusu bir yün yumağını kovalıyor.','Ne ___! Artı ___ parti oluyor!','On kedi yavrusunun hepsi sepette!','Sıcak bir ___. Çok ___ arkadaş!','Sadece bir kedi yavrusu minderde kaldı!'],
  zh: ['小猫俱乐部','两只小猫追着一团毛线球。','多么___！加上___就是派对了！','十只小猫全在篮子里！','温暖的___。这么多___朋友！','只有一只小猫留在垫子上。'],
};

S['nf4'] = {
  ar: ['فرقة الأرانب','خمسة أرانب تقفز إلى المرج!','___ تقفز عالياً. فقط ___ أكثر!','الجميع يحصل على عناق كبير!','الكثير من ___ أصدقاء يستمتعون بـ___!','عشر آذان أرنب تظهر من العشب!'],
  da: ['Kaninbandet','Fem kaniner hopper ud på engen!','___ hopper højt. Bare ___ mere!','Alle får et stort knus!','Så mange ___ venner har ___!','Ti kaninører stikker op af græsset!'],
  de: ['Hasenband','Fünf Häschen hüpfen auf die Wiese!','___ springen hoch. Nur ___ mehr!','Jeder bekommt eine große Umarmung!','So viele ___ Freunde haben ___!','Zehn Hasenohren tauchen aus dem Gras auf!'],
  es: ['Banda de Conejitos','¡Cinco conejitos saltan al prado!','¡___ saltan alto. Solo ___ más!','¡Todos reciben un gran abrazo!','¡Tantos ___ amigos divirtiéndose ___!','¡Diez orejas de conejo asoman de la hierba!'],
  fr: ['Groupe de Lapins','Cinq lapins sautent dans le pré !','___ sautent haut. Juste ___ de plus !','Tout le monde reçoit un gros câlin !','Tant d\'amis ___ s\'amusent ___ !','Dix oreilles de lapin sortent de l\'herbe !'],
  it: ['Banda dei Coniglietti','Cinque coniglietti saltano nel prato!','___ saltano in alto. Solo ___ di più!','Tutti ricevono un grande abbraccio!','Tanti amici ___ si divertono ___!','Dieci orecchie di coniglio spuntano dall\'erba!'],
  ja: ['うさぎバンド','ごひきのうさぎがはらっぱにとびだしたよ！','___びきがたかくとんだ。あと___びきだけ！','みんなおおきなハグをもらうよ！','たくさんの___なともだちが___をたのしんでいるよ！','じゅっこのうさぎのみみがくさからでてきた！'],
  la: ['Grex Cuniculorum','Quinque cuniculi in pratum saliunt!','___ alte saliunt. Tantum ___ plures!','Omnes magnum amplexum accipiunt!','Tot amici ___ ___!','Decem aures cuniculorum e gramine surgunt!'],
  nl: ['Konijnenband','Vijf konijntjes springen de wei in!','___ springen hoog. Nog maar ___!','Iedereen krijgt een grote knuffel!','Zoveel ___ vriendjes met ___!','Tien konijnenoren steken uit het gras!'],
  pl: ['Zespół Króliczków','Pięć króliczków skacze na łąkę!','___ skaczą wysoko. Tylko ___ więcej!','Wszyscy dostają wielkiego przytulasa!','Tyle ___ przyjaciół bawi się ___!','Dziesięć uszu króliczków wystaje z trawy!'],
  pt: ['Banda dos Coelhinhos','Cinco coelhinhos pulam para o prado!','___ pulam alto. Só mais ___!','Todos ganham um grande abraço!','Tantos amigos ___ se divertindo ___!','Dez orelhas de coelho aparecem na grama!'],
  tr: ['Tavşan Grubu','Beş tavşan çayıra zıplıyor!','___ yükseğe zıplıyor. Sadece ___ daha!','Herkes büyük bir sarılma alıyor!','Çok ___ arkadaş ___ yapıyor!','On tavşan kulağı çimlerden çıkıyor!'],
  zh: ['兔子乐队','五只兔子跳进了草地！','___只跳得很高。只差___只了！','每个人都得到一个大拥抱！','这么多___朋友在___！','十只兔子耳朵从草丛中冒出来！'],
};

S['nf5'] = {
  ar: ['أصدقاء البط','ست بطات صغيرة تمشي إلى البركة.','___ زوج يستمتع بـ___!','بطة واحدة كبيرة تقود الطريق!','فقط ___ وعناق كبير ___!','خمس بطات تسبح في خط مثالي!'],
  da: ['Andekammerater','Seks små ænder vader hen til dammen.','Et ___ par har ___!','Én stor and viser vejen!','Bare ___ og et stort ___!','Fem ænder svømmer i en perfekt linje!'],
  de: ['Entenfreunde','Sechs kleine Enten watscheln zum Teich.','Ein ___ Paar hat ___!','Eine große Ente führt den Weg an!','Nur ___ und ein großes ___!','Fünf Enten schwimmen in einer perfekten Reihe!'],
  es: ['Amigos Patos','¡Seis patitos caminan al estanque!','¡Un ___ par divirtiéndose ___!','¡Un pato grande lidera el camino!','¡Solo ___ y un gran ___!','¡Cinco patos nadan en línea perfecta!'],
  fr: ['Copains Canards','Six petits canards se dandinent vers l\'étang.','Une ___ paire s\'amuse ___ !','Un grand canard montre le chemin !','Juste ___ et un grand ___ !','Cinq canards nagent en ligne parfaite !'],
  it: ['Amici Paperelle','Sei paperelle camminano verso lo stagno.','Un ___ paio si diverte ___!','Una grande anatra guida il cammino!','Solo ___ e un grande ___!','Cinque anatre nuotano in fila perfetta!'],
  ja: ['あひるのなかま','ろっぴきのこあひるがいけにむかってよちよちあるいているよ。','___のペアが___をたのしんでいるよ！','おおきなあひるがみちをあんないしているよ！','___だけとおおきな___！','ごわのあひるがきれいにならんでおよいでいるよ！'],
  la: ['Amici Anates','Sex anaticula ad stagnum ambulant.','___ par ___ gaudet!','Una magna anas viam ducit!','Tantum ___ et magnum ___!','Quinque anates in ordine perfecto natant!'],
  nl: ['Eendenvriendjes','Zes kleine eendjes waggelen naar de vijver.','Een ___ paar dat ___ heeft!','Eén grote eend wijst de weg!','Slechts ___ en een grote ___!','Vijf eenden zwemmen in een perfecte lijn!'],
  pl: ['Przyjaciele Kaczuszki','Sześć małych kaczuszek idzie do stawu.','___ para bawi się ___!','Jedna duża kaczka prowadzi drogę!','Tylko ___ i wielki ___!','Pięć kaczek pływa w idealnym rzędzie!'],
  pt: ['Amigos Patinhos','Seis patinhos caminham até o lago.','Um ___ par se divertindo ___!','Um grande pato lidera o caminho!','Apenas ___ e um grande ___!','Cinco patos nadam em linha perfeita!'],
  tr: ['Ördek Arkadaşlar','Altı küçük ördek gölete doğru yürüyor.','Bir ___ çift ___ yapıyor!','Büyük bir ördek yol gösteriyor!','Sadece ___ ve büyük bir ___!','Beş ördek mükemmel bir sırada yüzüyor!'],
  zh: ['小鸭朋友','六只小鸭子摇摇摆摆走向池塘。','一___对在___！','一只大鸭子带路！','只有___和一个大___！','五只鸭子排成完美的一行游泳！'],
};

// ═══ COLOUR-COUNTING (cc1–cc5) ═══

S['cc1'] = {
  ar: ['أواني الطلاء','لون دافئ يملأ الوعاء الأول.','___ أوعية ووعاء ___ واحد!','خمسة أوعية في صف واحد!','وعاء ___ جميل، فقط ___!','عشرة ألوان تملأ الرف!'],
  da: ['Malingskrukker','En varm farve fylder den første krukke.','___ krukker og én ___ krukke!','Fem krukker på rad!','En smuk ___ krukke, bare ___!','Ti farver fylder hylden!'],
  de: ['Farbtöpfe','Eine warme Farbe füllt den ersten Topf.','___ Töpfe und ein ___ Topf!','Fünf Töpfe in einer Reihe!','Ein hübscher ___ Topf, nur ___!','Zehn Farben füllen das Regal!'],
  es: ['Botes de Pintura','Un color cálido llena el primer bote.','¡___ botes y un bote ___!','¡Cinco botes en fila!','¡Un bonito bote ___, solo ___!','¡Diez colores llenan el estante!'],
  fr: ['Pots de Peinture','Une couleur chaude remplit le premier pot.','___ pots et un pot ___ !','Cinq pots tous en rang !','Un joli pot ___, juste ___ !','Dix couleurs remplissent l\'étagère !'],
  it: ['Barattoli di Colore','Un colore caldo riempie il primo barattolo.','___ barattoli e un barattolo ___!','Cinque barattoli tutti in fila!','Un bel barattolo ___, solo ___!','Dieci colori riempiono lo scaffale!'],
  ja: ['えのぐのつぼ','あたたかいいろがさいしょのつぼをみたすよ。','___このつぼと___のつぼがひとつ！','いつつのつぼがならんでいるよ！','きれいな___のつぼ、___だけ！','じゅっしょくがたなをうめつくしたよ！'],
  la: ['Vasa Pigmenti','Color calidus primum vas implet.','___ vasa et unum ___ vas!','Quinque vasa in ordine!','Pulchrum ___ vas, tantum ___!','Decem colores pluteum implent!'],
  nl: ['Verfpotten','Een warme kleur vult de eerste pot.','___ potten en één ___ pot!','Vijf potten op een rij!','Een mooie ___ pot, slechts ___!','Tien kleuren vullen de plank!'],
  pl: ['Garnki z Farbą','Ciepły kolor wypełnia pierwszy garnek.','___ garnków i jeden ___ garnek!','Pięć garnków w rzędzie!','Ładny ___ garnek, tylko ___!','Dziesięć kolorów wypełnia półkę!'],
  pt: ['Potes de Tinta','Uma cor quente enche o primeiro pote.','___ potes e um pote ___!','Cinco potes em fila!','Um lindo pote ___, apenas ___!','Dez cores enchem a prateleira!'],
  tr: ['Boya Kutuları','Sıcak bir renk ilk kutuyu dolduruyor.','___ kutu ve bir ___ kutu!','Beş kutu sıra sıra!','Güzel bir ___ kutu, sadece ___!','On renk rafı dolduruyor!'],
  zh: ['颜料罐','温暖的颜色装满了第一个罐子。','___个罐子和一个___罐子！','五个罐子排成一排！','一个漂亮的___罐子，只有___！','十种颜色装满了架子！'],
};

S['cc2'] = {
  ar: ['صندوق الألوان','لون سماوي بارد يخرج من الصندوق.','___ دافئ بعده، ثم ___!','قلم واحد يرسم دائرة كبيرة.','عُد ___! ___ جميل ينضم!','خمسة أقلام تلون الصفحة!'],
  da: ['Farveskrinet','En kølig himmelfarve ruller ud af kassen.','En varm ___ dernæst, så ___!','Én farvekridt tegner en stor cirkel.','Tæl ___! En smuk ___ slutter sig til!','Fem farvekridt farver siden!'],
  de: ['Buntstiftbox','Eine kühle Himmelfarbe rollt aus der Box.','Ein warmes ___ als nächstes, dann ___!','Ein Buntstift malt einen großen Kreis.','Zähle ___! Ein hübsches ___ kommt dazu!','Fünf Buntstifte malen die Seite!'],
  es: ['Caja de Crayones','Un color fresco como el cielo sale de la caja.','¡Un ___ cálido después, luego ___!','Un crayón dibuja un gran círculo.','¡Cuenta ___! ¡Un bonito ___ se une!','¡Cinco crayones colorean la página!'],
  fr: ['Boîte de Crayons','Une couleur fraîche comme le ciel sort de la boîte.','Un ___ chaud ensuite, puis ___ !','Un crayon dessine un grand cercle.','Compte ___ ! Un joli ___ rejoint !','Cinq crayons colorient la page !'],
  it: ['Scatola di Pastelli','Un colore fresco come il cielo esce dalla scatola.','Un ___ caldo dopo, poi ___!','Un pastello disegna un grande cerchio.','Conta ___! Un bel ___ si unisce!','Cinque pastelli colorano la pagina!'],
  ja: ['クレヨンばこ','すずしいそらいろがはこからころがりでたよ。','あたたかい___がつぎに、そして___！','いっぽんのクレヨンがおおきなまるをかくよ。','___をかぞえて！きれいな___がなかまいり！','ごほんのクレヨンがページをいろどるよ！'],
  la: ['Arca Cerarum','Color frigidus caeli ex arca evolvitur.','Calidus ___ deinde, tum ___!','Una cera magnum circulum ducit.','Numera ___! Pulcher ___ se iungit!','Quinque cerae paginam colorant!'],
  nl: ['Krijtdoos','Een koele hemelkleur rolt uit de doos.','Een warme ___ daarna, dan ___!','Eén krijtje tekent een grote cirkel.','Tel ___! Een mooie ___ doet mee!','Vijf krijtjes kleuren de pagina!'],
  pl: ['Pudełko Kredek','Chłodny kolor nieba wysuwa się z pudełka.','Ciepły ___ następny, potem ___!','Jedna kredka rysuje duże koło.','Policz ___! Ładny ___ dołącza!','Pięć kredek koloruje stronę!'],
  pt: ['Caixa de Giz','Uma cor fresca como o céu sai da caixa.','Um ___ quente depois, então ___!','Um giz desenha um grande círculo.','Conte ___! Um lindo ___ se junta!','Cinco gizes colorem a página!'],
  tr: ['Boya Kalemi Kutusu','Serin bir gökyüzü rengi kutudan çıkıyor.','Sıcak bir ___ sonra, sonra ___!','Bir boya kalemi büyük bir daire çiziyor.','___ say! Güzel bir ___ katılıyor!','Beş boya kalemi sayfayı renklendiriyor!'],
  zh: ['蜡笔盒','一种凉爽的天蓝色从盒子里滚出来。','温暖的___接着，然后___！','一支蜡笔画了一个大圆圈。','数___！一个漂亮的___加入了！','五支蜡笔给页面上色！'],
};

S['cc3'] = {
  ar: ['قطار قوس القزح','أول عربة للقطار بلون ناعم جميل!','___ عربات! واحدة ___ دافئة!','أربع عربات تسير بصوت!','عربة ___ باردة، ثم ___!','محرك واحد يسحبهم جميعاً!'],
  da: ['Regnbuetog','Togets første vogn er en smuk, blød farve!','___ vogne! En varm ___ vogn!','Fire vogne tuller af sted!','En kølig ___ vogn, så ___!','Ét lokomotiv trækker dem alle!'],
  de: ['Regenbogenzug','Der erste Waggon des Zuges hat eine hübsche, sanfte Farbe!','___ Waggons! Ein warmer ___ Waggon!','Vier Waggons tuckern entlang!','Ein kühler ___ Waggon, dann ___!','Eine Lokomotive zieht sie alle!'],
  es: ['Tren Arcoíris','¡El primer vagón del tren es de un color bonito y suave!','¡___ vagones! ¡Uno ___ cálido!','¡Cuatro vagones avanzan!','¡Un vagón ___ fresco, luego ___!','¡Una locomotora los jala a todos!'],
  fr: ['Train Arc-en-ciel','Le premier wagon du train est d\'une jolie couleur douce !','___ wagons ! Un ___ chaud !','Quatre wagons avancent !','Un wagon ___ frais, puis ___ !','Une locomotive les tire tous !'],
  it: ['Treno Arcobaleno','Il primo vagone del treno è di un bel colore morbido!','___ vagoni! Uno ___ caldo!','Quattro vagoni avanzano!','Un vagone ___ fresco, poi ___!','Una locomotiva li traina tutti!'],
  ja: ['にじのでんしゃ','でんしゃのさいしょのしゃりょうはきれいでやわらかないろだよ！','___りょうのしゃりょう！あたたかい___のしゃりょう！','よんりょうのしゃりょうがガタゴトすすむよ！','すずしい___のしゃりょう、そして___！','いちだいのきかんしゃがぜんぶひっぱるよ！'],
  la: ['Tramen Arcus','Primum vehiculum traminis colore molli pulchro est!','___ vehicula! Calidum ___ unum!','Quattuor vehicula progrediuntur!','Frigidum ___ vehiculum, deinde ___!','Una machina omnia trahit!'],
  nl: ['Regenboogtrein','Het eerste rijtuig van de trein heeft een mooie, zachte kleur!','___ rijtuigen! Een warme ___ wagon!','Vier rijtuigen rijden verder!','Een koele ___ wagon, dan ___!','Eén locomotief trekt ze allemaal!'],
  pl: ['Tęczowy Pociąg','Pierwszy wagon pociągu ma piękny, delikatny kolor!','___ wagonów! Ciepły ___ wagon!','Cztery wagony jadą dalej!','Chłodny ___ wagon, potem ___!','Jedna lokomotywa ciągnie wszystkie!'],
  pt: ['Trem Arco-íris','O primeiro vagão do trem tem uma cor bonita e suave!','___ vagões! Um ___ quente!','Quatro vagões seguem em frente!','Um vagão ___ fresco, depois ___!','Uma locomotiva puxa todos!'],
  tr: ['Gökkuşağı Treni','Trenin ilk vagonu güzel, yumuşak bir renkte!','___ vagon! Sıcak bir ___ vagon!','Dört vagon ilerliyor!','Serin bir ___ vagon, sonra ___!','Bir lokomotif hepsini çekiyor!'],
  zh: ['彩虹火车','火车的第一节车厢是漂亮柔和的颜色！','___节车厢！一节温暖的___车厢！','四节车厢轰隆隆前进！','一节凉爽的___车厢，然后___！','一个火车头拉着所有的车厢！'],
};

S['cc4'] = {
  ar: ['طائرات الألوان','أربع طائرات ورقية تطير عالياً في السماء!','طائرة ___ واحدة فقط. واحدة ___ جميلة!','طائرة دافئة مشرقة تنضم للسماء!','___ طائرات ترقص، واحدة ___!','طائرتان تدوران في حلقة!'],
  da: ['Farvedrager','Fire drager flyver højt på himlen!','Bare ___ drage. En smuk ___ drage!','En klar varm drage slutter sig til himlen!','___ drager danser, én ___ drage!','To drager laver et loop-the-loop!'],
  de: ['Farbdrachen','Vier Drachen fliegen hoch am Himmel!','Nur ___ Drachen. Ein hübscher ___!','Ein leuchtend warmer Drachen kommt hinzu!','___ Drachen tanzen, ein ___!','Zwei Drachen drehen ein Looping!'],
  es: ['Cometas de Colores','¡Cuatro cometas vuelan alto en el cielo!','¡Solo ___ cometa. ¡Una bonita ___!','¡Una cometa cálida y brillante se une al cielo!','¡___ cometas bailan, una ___!','¡Dos cometas hacen un giro!'],
  fr: ['Cerfs-volants Colorés','Quatre cerfs-volants volent haut dans le ciel !','Juste ___ cerf-volant. Un joli ___ !','Un cerf-volant chaud et lumineux rejoint le ciel !','___ cerfs-volants dansent, un ___ !','Deux cerfs-volants font un looping !'],
  it: ['Aquiloni Colorati','Quattro aquiloni volano alti nel cielo!','Solo ___ aquilone. Un bel ___!','Un aquilone caldo e luminoso si unisce al cielo!','___ aquiloni danzano, uno ___!','Due aquiloni fanno un giro della morte!'],
  ja: ['いろのたこ','よっつのたこがそらたかくとんでいるよ！','___つだけのたこ。きれいな___のたこ！','あかるくあたたかいたこがそらになかまいり！','___のたこがおどる、___のたこがひとつ！','につのたこがぐるっとまわったよ！'],
  la: ['Aquilae Coloratae','Quattuor aquilae alte in caelo volant!','Tantum ___ aquila. Pulchra ___!','Clara calida aquila caelum intrat!','___ aquilae saltant, una ___!','Duae aquilae circuitum faciunt!'],
  nl: ['Kleurenvliegers','Vier vliegers vliegen hoog aan de lucht!','Slechts ___ vlieger. Een mooie ___!','Een heldere warme vlieger voegt zich bij de lucht!','___ vliegers dansen, één ___!','Twee vliegers maken een looping!'],
  pl: ['Kolorowe Latawce','Cztery latawce latają wysoko na niebie!','Tylko ___ latawiec. Piękny ___!','Jasny ciepły latawiec dołącza do nieba!','___ latawców tańczy, jeden ___!','Dwa latawce robią pętlę!'],
  pt: ['Pipas Coloridas','Quatro pipas voam alto no céu!','Apenas ___ pipa. Uma bonita ___!','Uma pipa brilhante e quente se junta ao céu!','___ pipas dançam, uma ___!','Duas pipas fazem um looping!'],
  tr: ['Renkli Uçurtmalar','Dört uçurtma gökyüzünde yükseliyor!','Sadece ___ uçurtma. Güzel bir ___!','Parlak sıcak bir uçurtma gökyüzüne katılıyor!','___ uçurtma dans ediyor, bir ___!','İki uçurtma takla atıyor!'],
  zh: ['彩色风筝','四只风筝在天空中高飞！','只有___只风筝。一只漂亮的___！','一只明亮温暖的风筝加入了天空！','___只风筝在跳舞，一只___！','两只风筝翻了个筋斗！'],
};

S['cc5'] = {
  ar: ['حديقة الطباشير','عشر علامات طباشير تلون الرصيف!','___ علامات، واحدة ___ دافئة!','طباشير بلون السماء البارد يرسم نهراً.','___ دوائر، ___ جميل قلب!','خمس زهور طباشير جميلة!'],
  da: ['Kridthave','Ti kridtstreger farver fortovet!','___ streger, en varm ___ streg!','Kølig himmelfarvet kridt tegner en flod.','___ cirkler, et smukt ___ hjerte!','Fem smukke kridtblomster!'],
  de: ['Kreidegarten','Zehn Kreidestriche färben den Bürgersteig!','___ Striche, ein warmer ___!','Kühle himmelblaue Kreide malt einen Fluss.','___ Kreise, ein hübsches ___ Herz!','Fünf wunderschöne Kreideblumen!'],
  es: ['Jardín de Tiza','¡Diez marcas de tiza colorean la acera!','¡___ marcas, una ___ cálida!','Tiza color cielo fresco dibuja un río.','¡___ círculos, un bonito ___ corazón!','¡Cinco hermosas flores de tiza!'],
  fr: ['Jardin de Craie','Dix traits de craie colorent le trottoir !','___ traits, un ___ chaud !','La craie couleur ciel dessine une rivière.','___ cercles, un joli cœur ___ !','Cinq belles fleurs de craie !'],
  it: ['Giardino di Gesso','Dieci segni di gesso colorano il marciapiede!','___ segni, uno ___ caldo!','Gesso color cielo disegna un fiume.','___ cerchi, un bel cuore ___!','Cinque bellissimi fiori di gesso!'],
  ja: ['チョークのにわ','じゅっこのチョークのしるしがほどうをいろどるよ！','___このしるし、あたたかい___のしるし！','すずしいそらいろのチョークがかわをかくよ。','___のまる、きれいな___のハート！','いつつのきれいなチョークのおはな！'],
  la: ['Hortus Cretae','Decem notae cretae pavimentum colorant!','___ notae, calida ___ una!','Frigida creta caeli flumen ducit.','___ circuli, pulchrum cor ___!','Quinque pulchri flores cretae!'],
  nl: ['Krijttuin','Tien krijtstrepen kleuren het trottoir!','___ strepen, een warme ___!','Koele hemelkleurige krijt tekent een rivier.','___ cirkels, een mooi ___ hart!','Vijf prachtige krijtbloemen!'],
  pl: ['Kredowy Ogród','Dziesięć kresek kredą koloruje chodnik!','___ kresek, ciepła ___ kreska!','Chłodna kreda w kolorze nieba rysuje rzekę.','___ kółek, piękne ___ serduszko!','Pięć pięknych kwiatów z kredy!'],
  pt: ['Jardim de Giz','Dez marcas de giz colorem a calçada!','___ marcas, uma ___ quente!','Giz cor de céu desenha um rio.','___ círculos, um lindo coração ___!','Cinco lindas flores de giz!'],
  tr: ['Tebeşir Bahçesi','On tebeşir izi kaldırımı renklendiriyor!','___ iz, sıcak bir ___!','Serin gökyüzü renginde tebeşir bir nehir çiziyor.','___ daire, güzel bir ___ kalp!','Beş güzel tebeşir çiçeği!'],
  zh: ['粉笔花园','十道粉笔痕迹给人行道上了色！','___道痕迹，一道温暖的___！','凉爽的天蓝色粉笔画了一条河。','___个圆圈，一个漂亮的___心形！','五朵美丽的粉笔花！'],
};

// ═══ SHAPE-COUNTING (sc1–sc5) ═══

S['sc1'] = {
  ar: ['قطار الأشكال','القطار مصنوع من أشكال رباعية!','عُد ___ و___!','أشكال دائرية لامعة تزين العربة.','___ مدببة على السقف، ___!','محرك واحد فقط في المقدمة!'],
  da: ['Formtog','Toget er lavet af firkantede former!','Tæl ___ og ___!','Runde glinsende former pynter vognen.','Spidse ___ på taget, ___!','Bare ét lokomotiv foran!'],
  de: ['Formenzug','Der Zug besteht aus vierseitigen Formen!','Zähle die ___ und die ___!','Runde funkelnde Formen schmücken den Waggon.','Spitze ___ auf dem Dach, ___!','Nur eine Lokomotive an der Spitze!'],
  es: ['Tren de Formas','¡El tren está hecho de formas cuadradas!','¡Cuenta los ___ y los ___!','Formas redondas brillantes decoran el vagón.','¡___ puntiagudos en el techo, ___!','¡Solo una locomotora al frente!'],
  fr: ['Train de Formes','Le train est fait de formes à quatre côtés !','Compte les ___ et les ___ !','Des formes rondes brillantes décorent le wagon.','Des ___ pointus sur le toit, ___ !','Juste une locomotive à l\'avant !'],
  it: ['Treno di Forme','Il treno è fatto di forme a quattro lati!','Conta i ___ e i ___!','Forme rotonde scintillanti decorano il vagone.','___ appuntiti sul tetto, ___!','Solo una locomotiva davanti!'],
  ja: ['かたちのでんしゃ','でんしゃはしかくいかたちでできているよ！','___と___をかぞえよう！','まるいキラキラしたかたちがしゃりょうをかざるよ。','やねにとがった___、___！','さきとうにきかんしゃがひとつだけ！'],
  la: ['Tramen Formarum','Tramen ex formis quadrilateris factum est!','Numera ___ et ___!','Rotundae formae splendidae vehiculum ornant.','Acutae ___ in tecto, ___!','Una tantum machina in fronte!'],
  nl: ['Vormentrein','De trein is gemaakt van vierkante vormen!','Tel de ___ en de ___!','Ronde glinsterende vormen versieren het rijtuig.','Puntige ___ op het dak, ___!','Slechts één locomotief vooraan!'],
  pl: ['Pociąg Kształtów','Pociąg jest zbudowany z czworokątnych kształtów!','Policz ___ i ___!','Okrągłe błyszczące kształty zdobią wagon.','Spiczaste ___ na dachu, ___!','Tylko jedna lokomotywa z przodu!'],
  pt: ['Trem de Formas','O trem é feito de formas quadradas!','Conte os ___ e os ___!','Formas redondas brilhantes decoram o vagão.','___ pontiagudos no teto, ___!','Apenas uma locomotiva na frente!'],
  tr: ['Şekil Treni','Tren dört kenarlı şekillerden yapılmış!','___ ve ___\'ı say!','Yuvarlak parlak şekiller vagonu süslüyor.','Çatıda sivri ___, ___!','Önde sadece bir lokomotif!'],
  zh: ['形状火车','火车是由四边形做成的！','数数___和___！','圆形闪亮的形状装饰着车厢。','屋顶上尖尖的___，___！','前面只有一个火车头！'],
};

S['sc2'] = {
  ar: ['قارب الأشكال','شكل خماسي يرشد القارب!','بضائع ___ بالأسفل، فقط ___!','شكل مدبب يوجه عبر الأمواج.','___ دائرية! عُد حتى ___!','شراعان يمسكان الريح!'],
  da: ['Formbåd','En femtakket form guider båden!','___ last nedenunder, bare ___!','En spids form styrer gennem bølgerne.','Runde ___! Tæl til ___!','To sejl fanger vinden!'],
  de: ['Formenboot','Eine fünfzackige Form führt das Boot!','Fracht ___ unten, nur ___!','Eine spitze Form steuert durch die Wellen.','Runde ___! Zähle bis ___!','Zwei Segel fangen den Wind!'],
  es: ['Barco de Formas','¡Una forma de cinco puntas guía el barco!','¡Carga ___ abajo, solo ___!','Una forma puntiaguda navega entre las olas.','¡___ redondos! ¡Cuenta hasta ___!','¡Dos velas atrapan el viento!'],
  fr: ['Bateau de Formes','Une forme à cinq pointes guide le bateau !','Cargaison ___ en bas, juste ___ !','Une forme pointue navigue à travers les vagues.','Des ___ ronds ! Compte jusqu\'à ___ !','Deux voiles attrapent le vent !'],
  it: ['Barca di Forme','Una forma a cinque punte guida la barca!','Carico ___ sotto, solo ___!','Una forma appuntita naviga tra le onde.','___ rotondi! Conta fino a ___!','Due vele catturano il vento!'],
  ja: ['かたちのふね','いつつのさきがあるかたちがふねをあんないするよ！','したに___のにもつ、___だけ！','とがったかたちがなみをきってすすむよ。','まるい___！___までかぞえよう！','ふたつのほがかぜをうけるよ！'],
  la: ['Navis Formarum','Forma quinque punctorum navem ducit!','Merces ___ infra, tantum ___!','Forma acuta per undas navigat.','Rotundae ___! Numera ad ___!','Duo vela ventum capiunt!'],
  nl: ['Vormenboot','Een vijfpuntige vorm geleidt de boot!','Lading ___ beneden, slechts ___!','Een puntige vorm stuurt door de golven.','Ronde ___! Tel tot ___!','Twee zeilen vangen de wind!'],
  pl: ['Łódka Kształtów','Pięcioramienny kształt prowadzi łódkę!','Ładunek ___ na dole, tylko ___!','Spiczasty kształt steruje przez fale.','Okrągłe ___! Policz do ___!','Dwa żagle łapią wiatr!'],
  pt: ['Barco de Formas','Uma forma de cinco pontas guia o barco!','Carga ___ embaixo, apenas ___!','Uma forma pontiaguda navega pelas ondas.','___ redondos! Conte até ___!','Duas velas pegam o vento!'],
  tr: ['Şekil Teknesi','Beş köşeli bir şekil tekneye rehberlik ediyor!','Altta ___ kargo, sadece ___!','Sivri bir şekil dalgalar arasında ilerliyor.','Yuvarlak ___! ___\'e kadar say!','İki yelken rüzgarı yakalıyor!'],
  zh: ['形状船','一个五角形引导着船！','下面的___货物，只有___！','一个尖形穿过波浪。','圆形的___！数到___！','两面帆迎着风！'],
};

S['sc3'] = {
  ar: ['طائرة الأشكال','خمسة أشكال تزين الطائرة الورقية!','___ مدبب و___!','الذيل مصنوع من أشكال رباعية.','زوج من أشكال ___. ___ أكثر!','عشرة أشكال ترقص في السماء!'],
  da: ['Formdrage','Fem former pynter dragen!','En spids ___ og en ___!','Halen er lavet af firkantede former.','Et par ___ former. ___ mere!','Ti former danser på himlen!'],
  de: ['Formendrachen','Fünf Formen schmücken den Drachen!','Ein spitzes ___ und ein ___!','Der Schwanz besteht aus vierseitigen Formen.','Ein Paar ___ Formen. ___ mehr!','Zehn Formen tanzen am Himmel!'],
  es: ['Cometa de Formas','¡Cinco formas decoran la cometa!','¡Un ___ puntiagudo y un ___!','La cola está hecha de formas cuadradas.','¡Un par de formas ___. ¡___ más!','¡Diez formas bailan en el cielo!'],
  fr: ['Cerf-volant de Formes','Cinq formes décorent le cerf-volant !','Un ___ pointu et un ___ !','La queue est faite de formes à quatre côtés.','Une paire de formes ___. ___ de plus !','Dix formes dansent dans le ciel !'],
  it: ['Aquilone di Forme','Cinque forme decorano l\'aquilone!','Un ___ appuntito e un ___!','La coda è fatta di forme a quattro lati.','Un paio di forme ___. ___ di più!','Dieci forme danzano nel cielo!'],
  ja: ['かたちのたこ','いつつのかたちがたこをかざるよ！','とがった___と___！','しっぽはしかくいかたちでできているよ。','___のかたちがにつ。___つふえた！','じゅっこのかたちがそらでおどるよ！'],
  la: ['Aquila Formarum','Quinque formae aquilam ornant!','Acutum ___ et ___!','Cauda ex formis quadrilateris facta est.','Par formarum ___. ___ plures!','Decem formae in caelo saltant!'],
  nl: ['Vormenvlieger','Vijf vormen versieren de vlieger!','Een puntige ___ en een ___!','De staart is gemaakt van vierkante vormen.','Een paar ___ vormen. ___ meer!','Tien vormen dansen aan de lucht!'],
  pl: ['Latawiec Kształtów','Pięć kształtów zdobi latawiec!','Spiczasty ___ i ___!','Ogon jest zrobiony z czworokątnych kształtów.','Para ___ kształtów. ___ więcej!','Dziesięć kształtów tańczy na niebie!'],
  pt: ['Pipa de Formas','Cinco formas decoram a pipa!','Um ___ pontiagudo e um ___!','A cauda é feita de formas quadradas.','Um par de formas ___. ___ mais!','Dez formas dançam no céu!'],
  tr: ['Şekil Uçurtması','Beş şekil uçurtmayı süslüyor!','Sivri bir ___ ve bir ___!','Kuyruk dört kenarlı şekillerden yapılmış.','Bir çift ___ şekil. ___ daha!','On şekil gökyüzünde dans ediyor!'],
  zh: ['形状风筝','五个形状装饰着风筝！','一个尖尖的___和一个___！','尾巴是由四边形做成的。','一对___形状。还有___个！','十个形状在天空中跳舞！'],
};

S['sc4'] = {
  ar: ['قلعة الأشكال','أبراج مدببة تعلو القلعة!','___ أبراج، كنز ___!','كل النوافذ العشر دائرية!','علم ___، فقط ___!','أحجار كريمة دائرية تلمع على التاج!'],
  da: ['Formslot','Spidse tårne kroner slottet!','___ tårne, en ___ skat!','Alle ti vinduer er runde!','Et ___ flag, bare ___!','Runde ædelstene funkler på kronen!'],
  de: ['Formenburg','Spitze Türme krönen die Burg!','___ Türme, ein ___ Schatz!','Alle zehn Fenster sind rund!','Eine ___ Flagge, nur ___!','Runde Edelsteine funkeln auf der Krone!'],
  es: ['Castillo de Formas','¡Torres puntiagudas coronan el castillo!','¡___ torres, un tesoro ___!','¡Las diez ventanas son redondas!','¡Una bandera ___, solo ___!','¡Gemas redondas brillan en la corona!'],
  fr: ['Château de Formes','Des tours pointues surmontent le château !','___ tours, un trésor ___ !','Les dix fenêtres sont toutes rondes !','Un drapeau ___, juste ___ !','Des gemmes rondes étincellent sur la couronne !'],
  it: ['Castello di Forme','Torri appuntite coronano il castello!','___ torri, un tesoro ___!','Tutte dieci le finestre sono rotonde!','Una bandiera ___, solo ___!','Gemme rotonde brillano sulla corona!'],
  ja: ['かたちのおしろ','とがったとうがおしろにそびえるよ！','___つのとう、___のたからもの！','じゅっこのまどぜんぶまるいよ！','___のはた、___だけ！','まるいほうせきがおうかんできらきらするよ！'],
  la: ['Castellum Formarum','Turres acutae castellum coronant!','___ turres, thesaurus ___!','Omnes decem fenestrae rotundae sunt!','Vexillum ___, tantum ___!','Gemmae rotundae in corona splendent!'],
  nl: ['Vormenkasteel','Puntige torens bekronen het kasteel!','___ torens, een ___ schat!','Alle tien ramen zijn rond!','Een ___ vlag, slechts ___!','Ronde edelstenen schitteren op de kroon!'],
  pl: ['Zamek Kształtów','Spiczaste wieże wieńczą zamek!','___ wież, skarb ___!','Wszystkie dziesięć okien jest okrągłych!','Flaga ___, tylko ___!','Okrągłe klejnoty lśnią na koronie!'],
  pt: ['Castelo de Formas','Torres pontiagudas coroam o castelo!','___ torres, um tesouro ___!','Todas as dez janelas são redondas!','Uma bandeira ___, apenas ___!','Gemas redondas brilham na coroa!'],
  tr: ['Şekil Kalesi','Sivri kuleler kaleyi taçlandırıyor!','___ kule, bir ___ hazine!','On pencerenin hepsi yuvarlak!','Bir ___ bayrak, sadece ___!','Yuvarlak mücevherler tacta parlıyor!'],
  zh: ['形状城堡','尖尖的塔楼矗立在城堡上！','___座塔，一个___宝藏！','所有十扇窗户都是圆的！','一面___旗帜，只有___！','圆形宝石在王冠上闪耀！'],
};

S['sc5'] = {
  ar: ['صاروخ الأشكال','فتحات دائرية تصطف على الصاروخ.','عُد ___، ___ مدبب!','زوج من الدافعات يشتعل!','___ أدوات تحكم و___!','شارة خماسية تميز الطيار!'],
  da: ['Formraket','Runde koøjer beklæder raketten.','Tæl ___, en spids ___!','Et par boostere fyrer!','___ kontroller og ___!','Et femtakket badge markerer piloten!'],
  de: ['Formenrakete','Runde Bullaugen säumen die Rakete.','Zähle ___, ein spitzes ___!','Ein Paar Booster feuern!','___ Kontrollen und ___!','Ein fünfzackiges Abzeichen markiert den Piloten!'],
  es: ['Cohete de Formas','¡Ojos de buey redondos recubren el cohete!','¡Cuenta ___, un ___ puntiagudo!','¡Un par de propulsores se encienden!','¡___ controles y ___!','¡Una insignia de cinco puntas marca al piloto!'],
  fr: ['Fusée de Formes','Des hublots ronds bordent la fusée.','Compte ___, un ___ pointu !','Une paire de propulseurs s\'allume !','___ commandes et ___ !','Un badge à cinq pointes marque le pilote !'],
  it: ['Razzo di Forme','Oblò rotondi rivestono il razzo.','Conta ___, un ___ appuntito!','Un paio di propulsori si accendono!','___ controlli e ___!','Un distintivo a cinque punte segna il pilota!'],
  ja: ['かたちのロケット','まるいまどがロケットにならんでいるよ。','___をかぞえて、とがった___！','につのブースターがはっしゃ！','___のそうじゅうそうちと___！','いつつのさきがあるバッジがパイロットのしるし！'],
  la: ['Navis Formarum Stellaris','Rotunda fenestella navem stellarem ornant.','Numera ___, acutum ___!','Par propulsorum accenditur!','___ gubernacula et ___!','Insigne quinque punctorum gubernatorem notat!'],
  nl: ['Vormenraket','Ronde patrijspoorten bekleden de raket.','Tel ___, een puntige ___!','Een paar boosters vuurt!','___ bedieningspanelen en ___!','Een vijfpuntige badge markeert de piloot!'],
  pl: ['Rakieta Kształtów','Okrągłe iluminatory pokrywają rakietę.','Policz ___, spiczasty ___!','Para dopalaczów odpala!','___ sterowników i ___!','Pięcioramienna odznaka oznacza pilota!'],
  pt: ['Foguete de Formas','Escotilhas redondas revestem o foguete.','Conte ___, um ___ pontiagudo!','Um par de propulsores dispara!','___ controles e ___!','Um distintivo de cinco pontas marca o piloto!'],
  tr: ['Şekil Roketi','Yuvarlak lombozlar roketi kaplıyor.','___ say, sivri bir ___!','Bir çift güçlendirici ateşleniyor!','___ kontrol ve ___!','Beş köşeli bir rozet pilotu işaretliyor!'],
  zh: ['形状火箭','圆形舷窗排列在火箭上。','数___，一个尖尖的___！','一对助推器点火了！','___个控制器和___！','一枚五角徽章标记着飞行员！'],
};

// ═══ ONE-TWO-THREE (ot1–ot5) ═══

S['ot1'] = {
  ar: ['عد الخطوات','خطوة واحدة للأمام على الطريق.','___ خطوات أخرى! ___ كبيرة!','ست حجارة عبور فوق الجدول.','عُد حتى ___! حان وقت ___!','خمس قفزات إلى خط النهاية!'],
  da: ['Trin-tælling','Et skridt fremad på stien.','___ skridt mere! Store ___!','Seks trædesten krydser bækken.','Tæl til ___! Tid til at ___!','Fem hop til mål!'],
  de: ['Schritte Zählen','Ein Schritt vorwärts auf dem Weg.','___ Schritte mehr! Große ___!','Sechs Trittsteine überqueren den Bach.','Zähle bis ___! Zeit zum ___!','Fünf Sprünge bis zum Ziel!'],
  es: ['Cuenta de Pasos','Un paso adelante en el camino.','¡___ pasos más! ¡Grandes ___!','Seis piedras cruzan el arroyo.','¡Cuenta hasta ___! ¡Hora de ___!','¡Cinco saltos hasta la meta!'],
  fr: ['Compte de Pas','Un pas en avant sur le chemin.','___ pas de plus ! De grands ___ !','Six pierres traversent le ruisseau.','Compte jusqu\'à ___ ! C\'est l\'heure de ___ !','Cinq sauts jusqu\'à la ligne d\'arrivée !'],
  it: ['Conto dei Passi','Un passo avanti sul sentiero.','___ passi in più! Grandi ___!','Sei pietre attraversano il ruscello.','Conta fino a ___! È ora di ___!','Cinque salti al traguardo!'],
  ja: ['ステップかぞえ','みちをいっぽまえにすすむよ。','あと___ぽ！おおきな___！','ろっこのとびいしがこがわをわたるよ。','___までかぞえて！___するじかんだよ！','ゴールまでごかい！'],
  la: ['Passuum Numeratio','Unus passus in via.','___ passus plures! Magni ___!','Sex lapides rivum transent.','Numera ad ___! Tempus ___!','Quinque saltus ad metam!'],
  nl: ['Stappen Tellen','Eén stap vooruit op het pad.','___ stappen meer! Grote ___!','Zes stapstenen over de beek.','Tel tot ___! Tijd om te ___!','Vijf sprongen naar de finish!'],
  pl: ['Liczenie Kroków','Jeden krok do przodu na ścieżce.','___ kroków więcej! Duże ___!','Sześć kamieni przejściowych nad strumieniem.','Policz do ___! Czas na ___!','Pięć skoków do mety!'],
  pt: ['Contagem de Passos','Um passo à frente no caminho.','___ passos a mais! Grandes ___!','Seis pedras atravessam o riacho.','Conte até ___! Hora de ___!','Cinco pulos até a linha de chegada!'],
  tr: ['Adım Sayma','Yolda bir adım ileri.','___ adım daha! Büyük ___!','Altı basamak taşı dereyi geçiyor.','___\'e kadar say! ___ zamanı!','Bitiş çizgisine beş zıplama!'],
  zh: ['步数计数','在路上向前迈一步。','又多了___步！大___！','六块踏脚石穿过小溪。','数到___！该___了！','五步跳到终点！'],
};

S['ot2'] = {
  ar: ['القفز على الغيوم','سحابتان رقيقتان للقفز عليهما!','فقط ___ غيمة. ___ أخرى في الأمام!','حان وقت جمع الغيوم!','___ غيوم في المجموع. كم ___!','عشر غيوم في صف!'],
  da: ['Skyhop','To bløde skyer at hoppe over!','Bare ___ sky. ___ mere forude!','Tid til at tælle skyerne sammen!','___ skyer i alt. Så ___!','Ti skyer på rad!'],
  de: ['Wolkenhüpfen','Zwei flauschige Wolken zum Drüberhüpfen!','Nur ___ Wolke. ___ mehr voraus!','Zeit die Wolken zusammenzuzählen!','___ Wolken insgesamt. So ___!','Zehn Wolken in einer Reihe!'],
  es: ['Salto de Nubes','¡Dos nubes esponjosas para saltar!','¡Solo ___ nube. ¡___ más adelante!','¡Hora de sumar las nubes!','¡___ nubes en total. ¡Qué ___!','¡Diez nubes en fila!'],
  fr: ['Saut de Nuages','Deux nuages duveteux à traverser !','Juste ___ nuage. ___ de plus devant !','C\'est l\'heure d\'additionner les nuages !','___ nuages en tout. Tellement ___ !','Dix nuages en rang !'],
  it: ['Salto sulle Nuvole','Due nuvole soffici su cui saltare!','Solo ___ nuvola. ___ altre avanti!','È ora di sommare le nuvole!','___ nuvole in tutto. Che ___!','Dieci nuvole in fila!'],
  ja: ['くもジャンプ','ふたつのふわふわのくもをとびこえよう！','___つだけのくも。まだ___つさきにあるよ！','くもをたしざんするじかんだよ！','ぜんぶで___このくも。すごい___！','じゅっこのくもがならんでいるよ！'],
  la: ['Saltus Nubium','Duae nubes molles ad saliendum!','Tantum ___ nubes. ___ plures ante!','Tempus nubes addendi!','___ nubes in summa. Quam ___!','Decem nubes in ordine!'],
  nl: ['Wolkensprong','Twee pluizige wolken om overheen te springen!','Slechts ___ wolk. ___ meer vooruit!','Tijd om de wolken op te tellen!','___ wolken in totaal. Zo ___!','Tien wolken op een rij!'],
  pl: ['Skok po Chmurach','Dwie puszyste chmury do przeskoczenia!','Tylko ___ chmura. ___ więcej przed nami!','Czas dodać chmury!','___ chmur łącznie. Jakie ___!','Dziesięć chmur w rzędzie!'],
  pt: ['Pulo nas Nuvens','Duas nuvens fofas para pular!','Apenas ___ nuvem. ___ mais à frente!','Hora de somar as nuvens!','___ nuvens no total. Que ___!','Dez nuvens em fila!'],
  tr: ['Bulut Zıplama','Üzerinden zıplanacak iki kabarık bulut!','Sadece ___ bulut. İleride ___ daha!','Bulutları toplama zamanı!','Toplamda ___ bulut. Ne kadar ___!','On bulut sıra sıra!'],
  zh: ['云朵跳跃','两朵蓬松的云可以跳过去！','只有___朵云。前面还有___朵！','该把云朵加起来了！','总共___朵云。好___！','十朵云排成一排！'],
};

S['ot3'] = {
  ar: ['مسار النحلة','عشر زهور على مسار النحلة!','___ زهور و___ نحلات!','نحلة كبيرة طنانة تهبط!','___ بتلات، فقط ___!','أربعة أحواض زهور لزيارتها!'],
  da: ['Bistien','Ti blomster på biens sti!','___ blomster og ___ bier!','En stor summende bi lander!','___ kronblade, bare ___!','Fire blomsterbede at besøge!'],
  de: ['Bienenweg','Zehn Blumen auf dem Bienenweg!','___ Blumen und ___ Bienen!','Eine große summende Biene landet!','___ Blütenblätter, nur ___!','Vier Blumenbeete zu besuchen!'],
  es: ['Camino de Abejas','¡Diez flores en el camino de la abeja!','¡___ flores y ___ abejas!','¡Una gran abeja zumbadora aterriza!','¡___ pétalos, solo ___!','¡Cuatro jardines para visitar!'],
  fr: ['Chemin des Abeilles','Dix fleurs sur le chemin de l\'abeille !','___ fleurs et ___ abeilles !','Une grosse abeille bourdonnante atterrit !','___ pétales, juste ___ !','Quatre parterres de fleurs à visiter !'],
  it: ['Sentiero delle Api','Dieci fiori sul sentiero dell\'ape!','___ fiori e ___ api!','Una grande ape ronzante atterra!','___ petali, solo ___!','Quattro aiuole da visitare!'],
  ja: ['はちのみち','はちのみちにじゅっこのおはながあるよ！','___このおはなと___びきのはち！','おおきなブンブンはちがおりてきた！','___まいのはなびら、___だけ！','よっつのかだんをまわろう！'],
  la: ['Via Apum','Decem flores in via apis!','___ flores et ___ apes!','Magna apis bombitans descendit!','___ petala, tantum ___!','Quattuor areolae florum visitandae!'],
  nl: ['Bijenpad','Tien bloemen op het pad van de bij!','___ bloemen en ___ bijen!','Een grote zoemende bij landt!','___ blaadjes, slechts ___!','Vier bloemperken om te bezoeken!'],
  pl: ['Ścieżka Pszczół','Dziesięć kwiatów na ścieżce pszczoły!','___ kwiatów i ___ pszczół!','Duża brzęcząca pszczoła ląduje!','___ płatków, tylko ___!','Cztery klomby do odwiedzenia!'],
  pt: ['Trilha das Abelhas','Dez flores na trilha da abelha!','___ flores e ___ abelhas!','Uma grande abelha zumbindo pousa!','___ pétalas, apenas ___!','Quatro canteiros para visitar!'],
  tr: ['Arı Yolu','Arının yolunda on çiçek!','___ çiçek ve ___ arı!','Büyük bir vızıldayan arı iniyor!','___ yaprak, sadece ___!','Ziyaret edilecek dört çiçek tarhı!'],
  zh: ['蜜蜂小径','蜜蜂小径上有十朵花！','___朵花和___只蜜蜂！','一只大蜜蜂嗡嗡地降落了！','___片花瓣，只有___！','四个花坛要去看看！'],
};

S['ot4'] = {
  ar: ['قفزة الأوراق','خمس أوراق تسقط من الشجرة!','حان وقت ___! عُد حتى ___!','أربع أوراق تدور في الريح!','___ أخرى تهبط، كم ___!','ورقة ذهبية واحدة فقط بقيت!'],
  da: ['Bladspring','Fem blade falder fra træet!','Tid til at ___! Tæl til ___!','Fire blade snurrer i vinden!','___ mere lander, så ___!','Bare ét gyldent blad tilbage!'],
  de: ['Blattsprung','Fünf Blätter fallen vom Baum!','Zeit zum ___! Zähle bis ___!','Vier Blätter wirbeln im Wind!','___ mehr landen, so ___!','Nur noch ein goldenes Blatt übrig!'],
  es: ['Salto de Hojas','¡Cinco hojas caen del árbol!','¡Hora de ___! ¡Cuenta hasta ___!','¡Cuatro hojas giran en el viento!','¡___ más caen, qué ___!','¡Solo queda una hoja dorada!'],
  fr: ['Saut de Feuilles','Cinq feuilles tombent de l\'arbre !','C\'est l\'heure de ___ ! Compte jusqu\'à ___ !','Quatre feuilles tournoient dans le vent !','___ de plus atterrissent, tellement ___ !','Juste une feuille dorée reste !'],
  it: ['Salto delle Foglie','Cinque foglie cadono dall\'albero!','È ora di ___! Conta fino a ___!','Quattro foglie girano nel vento!','___ altre atterrano, che ___!','Solo una foglia dorata è rimasta!'],
  ja: ['はっぱジャンプ','いつつのはっぱがきからおちるよ！','___するじかんだよ！___までかぞえて！','よんまいのはっぱがかぜでくるくるまわるよ！','___まいおりてきて、すごい___！','きんいろのはっぱがいちまいだけのこったよ！'],
  la: ['Saltus Foliorum','Quinque folia de arbore cadunt!','Tempus ___! Numera ad ___!','Quattuor folia in vento girant!','___ plura descendunt, quam ___!','Unum tantum folium aureum manet!'],
  nl: ['Bladsprong','Vijf bladeren vallen van de boom!','Tijd om te ___! Tel tot ___!','Vier bladeren wervelen in de wind!','___ meer landen, zo ___!','Nog maar één gouden blad over!'],
  pl: ['Skok Liści','Pięć liści spada z drzewa!','Czas na ___! Policz do ___!','Cztery liście wirują na wietrze!','___ więcej ląduje, jakie ___!','Tylko jeden złoty liść został!'],
  pt: ['Pulo das Folhas','Cinco folhas caem da árvore!','Hora de ___! Conte até ___!','Quatro folhas giram no vento!','___ mais pousam, que ___!','Apenas uma folha dourada restou!'],
  tr: ['Yaprak Zıplama','Ağaçtan beş yaprak düşüyor!','___ zamanı! ___\'e kadar say!','Dört yaprak rüzgarda dönüyor!','___ tane daha iniyor, ne ___!','Sadece bir altın yaprak kaldı!'],
  zh: ['落叶跳跃','五片叶子从树上落下！','该___了！数到___！','四片叶子在风中旋转！','又有___片落下，好___！','只剩下一片金色的叶子了！'],
};

S['ot5'] = {
  ar: ['تراشق البرك','حان وقت جمع البرك!','___ برك و___!','ست رشات كبيرة!','___ تموجات، ثم ___!','بطة كبيرة ترتش في أكبر بركة!'],
  da: ['Pyt-plask','Tid til at tælle pytterne sammen!','___ pytter og ___!','Seks store plask!','___ ringe, så ___!','En stor and plasker i den største!'],
  de: ['Pfützenspritzer','Zeit die Pfützen zusammenzuzählen!','___ Pfützen und ___!','Sechs große Spritzer!','___ Wellen, dann ___!','Eine große Ente planscht in der größten!'],
  es: ['Chapoteo de Charcos','¡Hora de sumar los charcos!','¡___ charcos y ___!','¡Seis grandes salpicaduras!','¡___ ondas, luego ___!','¡Un gran pato chapotea en el más grande!'],
  fr: ['Éclaboussure de Flaques','C\'est l\'heure d\'additionner les flaques !','___ flaques et ___ !','Six grandes éclaboussures !','___ ondulations, puis ___ !','Un grand canard éclabousse dans la plus grande !'],
  it: ['Schizzo nelle Pozzanghere','È ora di sommare le pozzanghere!','___ pozzanghere e ___!','Sei grandi schizzi!','___ increspature, poi ___!','Una grande anatra sguazza nella più grande!'],
  ja: ['みずたまりバシャ','みずたまりをたしざんするじかんだよ！','___このみずたまりと___！','ろっかいのおおきなバシャ！','___つのさざなみ、そして___！','おおきなあひるがいちばんおおきなみずたまりでバシャバシャ！'],
  la: ['Aspersio Lacunarum','Tempus lacunas addendi!','___ lacunae et ___!','Sex magni aspersiones!','___ undulae, deinde ___!','Magna anas in maxima aspergitur!'],
  nl: ['Plassenspetters','Tijd om de plassen op te tellen!','___ plassen en ___!','Zes grote spatten!','___ rimpels, dan ___!','Een grote eend plonst in de grootste!'],
  pl: ['Plusk w Kałużach','Czas dodać kałuże!','___ kałuż i ___!','Sześć wielkich pluszków!','___ fal, potem ___!','Duża kaczka pluska się w największej!'],
  pt: ['Chapinhar nas Poças','Hora de somar as poças!','___ poças e ___!','Seis grandes chapinhadas!','___ ondulações, depois ___!','Um grande pato chapinha na maior!'],
  tr: ['Su Birikintisi Sıçratma','Birikintileri toplama zamanı!','___ birikinti ve ___!','Altı büyük sıçrama!','___ dalga, sonra ___!','Büyük bir ördek en büyüğünde sıçrıyor!'],
  zh: ['水坑飞溅','该把水坑加起来了！','___个水坑和___！','六次大飞溅！','___个涟漪，然后___！','一只大鸭子在最大的水坑里扑腾！'],
};

// ═══ MEDIUM: WORD PROBLEMS (wp1–wp5) ═══

S['wp1'] = {
  ar: ['عد الغابة','كم شجرة؟ دعونا نعدها!','___ أشجار. ___ هو ___.','ثمانية فطر تنمو في دائرة.','___ من البلوط! ___ المكسرات!','الإجمالي وصل. أحسنت!'],
  da: ['Skovtælling','Hvor mange træer? Lad os tælle dem op!','___ træer. ___ er ___.','Otte svampe vokser i en cirkel.','En ___ af agern! ___ nødderne!','Totalen er klar. Godt gået!'],
  de: ['Waldzählen','Wie viele Bäume? Lass uns sie zählen!','___ Bäume. Das ___ ist ___.','Acht Pilze wachsen im Kreis.','Eine ___ Eicheln! ___ die Nüsse!','Die Summe steht. Gut gemacht!'],
  es: ['Cuenta del Bosque','¿Cuántos árboles? ¡Contémoslos!','___ árboles. El ___ es ___.','¡Ocho hongos crecen en círculo!','¡Un ___ de bellotas! ¡___ las nueces!','¡El total está listo. ¡Bien hecho!'],
  fr: ['Compte de la Forêt','Combien d\'arbres ? Comptons-les !','___ arbres. Le ___ est ___.','Huit champignons poussent en cercle.','Un ___ de glands ! ___ les noix !','Le total est là. Bien joué !'],
  it: ['Conto della Foresta','Quanti alberi? Contiamoli!','___ alberi. Il ___ è ___.','Otto funghi crescono in cerchio.','Un ___ di ghiande! ___ le noci!','Il totale è arrivato. Ben fatto!'],
  ja: ['もりのかぞえ','きはなんぼんかな？かぞえよう！','___ぽんのき。___は___だよ。','やっつのきのこがまるくはえているよ。','___のどんぐり！___をかぞえよう！','ごうけいがでた。よくできたね！'],
  la: ['Silvae Numeratio','Quot arbores? Numeremus!','___ arbores. ___ est ___.','Octo fungi in circulo crescunt.','___ glandium! ___ nuces!','Summa adest. Bene factum!'],
  nl: ['Bostelling','Hoeveel bomen? Laten we ze tellen!','___ bomen. De ___ is ___.','Acht paddenstoelen groeien in een kring.','Een ___ eikels! ___ de noten!','Het totaal is er. Goed gedaan!'],
  pl: ['Liczenie w Lesie','Ile drzew? Policzmy je!','___ drzew. ___ to ___.','Osiem grzybów rośnie w kółku.','___ żołędzi! ___ orzechy!','Suma jest gotowa. Dobra robota!'],
  pt: ['Contagem da Floresta','Quantas árvores? Vamos contá-las!','___ árvores. O ___ é ___.','Oito cogumelos crescem em círculo.','Um ___ de bolotas! ___ as nozes!','O total chegou. Muito bem!'],
  tr: ['Orman Sayma','Kaç ağaç var? Hadi sayalım!','___ ağaç. ___ ___.','Sekiz mantar bir daire içinde büyüyor.','Bir ___ meşe palamudu! ___ fındıkları!','Toplam belli oldu. Aferin!'],
  zh: ['森林计数','有多少棵树？让我们数一数！','___棵树。___是___。','八个蘑菇围成一圈生长。','一___橡子！___坚果！','总数出来了。做得好！'],
};

S['wp2'] = {
  ar: ['رياضيات النجوم','سبع نجوم تتلألأ في خط.','___ أخرى تظهر. ___ إلى ___!','ضاعف النجوم! عدها مرتين.','___ و___ يصنعان ___.','دزينة كاملة من النجوم تملأ السماء!'],
  da: ['Stjernematematik','Syv stjerner blinker i en linje.','___ mere dukker op. ___ til ___!','Fordobl stjernerne! Tæl dem to gange.','___ og ___ giver ___.','Et helt dusin stjerner fylder himlen!'],
  de: ['Sternenmathe','Sieben Sterne funkeln in einer Reihe.','___ mehr erscheinen. ___ zur ___!','Verdoppele die Sterne! Zähle sie zweimal.','___ und ___ ergeben ___.','Ein ganzes Dutzend Sterne füllt den Himmel!'],
  es: ['Matemáticas Estelares','Siete estrellas brillan en línea.','¡___ más aparecen. ___ al ___!','¡Duplica las estrellas! Cuéntalas dos veces.','¡___ y ___ hacen ___!','¡Una docena entera de estrellas llena el cielo!'],
  fr: ['Maths des Étoiles','Sept étoiles scintillent en ligne.','___ de plus apparaissent. ___ au ___ !','Double les étoiles ! Compte-les deux fois.','___ et ___ font ___.','Une douzaine entière d\'étoiles remplit le ciel !'],
  it: ['Matematica Stellare','Sette stelle brillano in fila.','___ di più appaiono. ___ al ___!','Raddoppia le stelle! Contale due volte.','___ e ___ fanno ___.','Una dozzina intera di stelle riempie il cielo!'],
  ja: ['ほしのさんすう','ななつのほしがならんでかがやいているよ。','___つふえた。___へ___！','ほしをばいにしよう！にかいかぞえてね。','___と___で___になるよ。','いちダースのほしがそらをうめつくしたよ！'],
  la: ['Stellarum Mathematica','Septem stellae in linea micant.','___ plures apparent. ___ ad ___!','Stellas duplica! Bis numera.','___ et ___ faciunt ___.','Duodecim stellae caelum implent!'],
  nl: ['Sterrenrekenen','Zeven sterren twinkelen op een rij.','___ meer verschijnen. ___ naar de ___!','Verdubbel de sterren! Tel ze twee keer.','___ en ___ maken ___.','Een heel dozijn sterren vult de lucht!'],
  pl: ['Gwiezdna Matematyka','Siedem gwiazd błyszczy w linii.','___ więcej się pojawia. ___ do ___!','Podwój gwiazdy! Policz je dwa razy.','___ i ___ daje ___.','Cały tuzin gwiazd wypełnia niebo!'],
  pt: ['Matemática Estelar','Sete estrelas brilham em linha.','___ mais aparecem. ___ ao ___!','Dobre as estrelas! Conte-as duas vezes.','___ e ___ fazem ___.','Uma dúzia inteira de estrelas enche o céu!'],
  tr: ['Yıldız Matematiği','Yedi yıldız bir sırada parlıyor.','___ tane daha beliriyor. ___\'e ___!','Yıldızları ikiye katla! İki kez say.','___ ve ___ ___ yapar.','Bir düzine yıldız gökyüzünü dolduruyor!'],
  zh: ['星星数学','七颗星星排成一行闪烁。','又出现了___颗。___到___！','把星星翻倍！数两遍。','___加___等于___。','整整一打星星布满了天空！'],
};

S['wp3'] = {
  ar: ['مجموع النهر','الأسماك متساوية على كل جانب من النهر!','___ سمكة، ___ منها. ___!','خذ بعضها — حان وقت الطرح!','___ بقيت. ___ سمكة. ___ واضح!','عدها جميعاً مرة أخرى!'],
  da: ['Flodsum','Fiskene er lige mange på hver side af floden!','___ fisk, en ___ af dem. ___!','Tag nogle væk — tid til at trække fra!','___ er tilbage. ___ fisk. ___ er klar!','Tæl dem alle én gang til!'],
  de: ['Flusssumme','Die Fische sind auf jeder Seite gleich!','___ Fische, ein ___ davon. ___!','Nimm welche weg — Zeit zum Subtrahieren!','___ bleiben. ___ Fische. Das ___ ist klar!','Zähle sie alle noch einmal!'],
  es: ['Suma del Río','¡Los peces son iguales en cada lado del río!','¡___ peces, un ___ de ellos. ___!','¡Quita algunos — hora de restar!','¡___ quedan. ___ peces. ¡El ___ es claro!','¡Cuéntalos todos una vez más!'],
  fr: ['Somme de la Rivière','Les poissons sont égaux de chaque côté !','___ poissons, un ___ d\'entre eux. ___ !','Enlevez-en — c\'est l\'heure de soustraire !','___ restent. ___ poissons. Le ___ est clair !','Comptez-les tous encore une fois !'],
  it: ['Somma del Fiume','I pesci sono uguali su ogni lato del fiume!','___ pesci, un ___ di loro. ___!','Togline alcuni — è ora di sottrarre!','___ rimangono. ___ pesci. Il ___ è chiaro!','Contali tutti ancora una volta!'],
  ja: ['かわのたしざん','かわのりょうがわでさかなのかずがおなじだよ！','___びきのさかな、そのうち___。___！','いくつかとろう — ひきざんのじかんだよ！','___びきのこった。___びきのさかな。___がわかったよ！','もういっかいぜんぶかぞえよう！'],
  la: ['Summa Fluminis','Pisces aequales sunt in utroque latere!','___ pisces, ___ eorum. ___!','Aliquos remove — tempus subtrahendi!','___ manent. ___ pisces. ___ clarum est!','Omnes iterum numera!'],
  nl: ['Riviersom','De vissen zijn gelijk aan elke kant!','___ vissen, een ___ ervan. ___!','Neem er wat weg — tijd om af te trekken!','___ blijven over. ___ vissen. De ___ is duidelijk!','Tel ze allemaal nog een keer!'],
  pl: ['Suma Rzeki','Ryby są równe po każdej stronie rzeki!','___ ryb, ___ z nich. ___!','Zabierz kilka — czas na odejmowanie!','___ zostało. ___ ryb. ___ jest jasne!','Policz je wszystkie jeszcze raz!'],
  pt: ['Soma do Rio','Os peixes são iguais em cada lado do rio!','___ peixes, um ___ deles. ___!','Tire alguns — hora de subtrair!','___ restam. ___ peixes. O ___ é claro!','Conte todos mais uma vez!'],
  tr: ['Nehir Toplamı','Balıklar nehrin her iki tarafında eşit!','___ balık, bir ___ tanesi. ___!','Bazılarını çıkar — çıkarma zamanı!','___ kaldı. ___ balık. ___ açık!','Hepsini bir kez daha say!'],
  zh: ['河流总和','河的两边鱼的数量相等！','___条鱼，其中___条。___！','拿走一些——该做减法了！','剩下___条。___条鱼。___很清楚！','再把它们全部数一遍！'],
};

S['wp4'] = {
  ar: ['حساب الغيوم','دزينة كاملة من الغيوم تتدحرج!','___ الغيوم. كلها ___. ___ للانطلاق!','الإجمالي يستمر في النمو!','___ كل الغيوم! ___ تظهر. ___!','كل شيء متساوٍ ومتوازن في السماء.'],
  da: ['Skytælling','Et helt dusin skyer ruller ind!','___ skyerne. De er alle ___. ___ at gå!','Totalen vokser hele tiden!','___ alle skyerne! ___ dukker op. ___!','Alt er lige og balanceret på himlen.'],
  de: ['Wolkenzählung','Ein ganzes Dutzend Wolken zieht auf!','___ die Wolken. Sie sind alle ___. ___ los!','Die Summe wächst weiter!','___ alle Wolken! ___ erscheinen. ___!','Alles ist gleich und ausgeglichen am Himmel.'],
  es: ['Conteo de Nubes','¡Una docena entera de nubes se acercan!','¡___ las nubes. Todas son ___. ___ a seguir!','¡El total sigue creciendo!','¡___ todas las nubes! ___ aparecen. ___!','Todo está igual y equilibrado en el cielo.'],
  fr: ['Comptage de Nuages','Une douzaine entière de nuages arrive !','___ les nuages. Ils sont tous ___. ___ partis !','Le total continue de grandir !','___ tous les nuages ! ___ apparaissent. ___ !','Tout est égal et équilibré dans le ciel.'],
  it: ['Conteggio delle Nuvole','Una dozzina intera di nuvole arriva!','___ le nuvole. Sono tutte ___. ___ via!','Il totale continua a crescere!','___ tutte le nuvole! ___ appaiono. ___!','Tutto è uguale e bilanciato nel cielo.'],
  ja: ['くものけいさん','いちダースのくもがやってくるよ！','くもを___。ぜんぶ___だよ。___でスタート！','ごうけいがふえつづけるよ！','くもをぜんぶ___！___がでてくる。___！','そらのなかですべてがひとしくバランスがとれているよ。'],
  la: ['Nubium Computatio','Duodecim nubes adveniunt!','___ nubes. Omnes ___. ___ proficisci!','Summa crescere pergit!','___ omnes nubes! ___ apparent. ___!','Omnia in caelo aequalia et librata sunt.'],
  nl: ['Wolkentelling','Een heel dozijn wolken rolt binnen!','___ de wolken. Ze zijn allemaal ___. ___ gaan!','Het totaal blijft groeien!','___ alle wolken! ___ verschijnen. ___!','Alles is gelijk en in balans aan de lucht.'],
  pl: ['Liczenie Chmur','Cały tuzin chmur nadciąga!','___ chmury. Wszystkie ___. ___ ruszamy!','Suma ciągle rośnie!','___ wszystkie chmury! ___ się pojawia. ___!','Wszystko jest równe i zbalansowane na niebie.'],
  pt: ['Contagem de Nuvens','Uma dúzia inteira de nuvens se aproxima!','___ as nuvens. Todas são ___. ___ para ir!','O total continua crescendo!','___ todas as nuvens! ___ aparecem. ___!','Tudo está igual e equilibrado no céu.'],
  tr: ['Bulut Sayımı','Bir düzine bulut geliyor!','Bulutları ___. Hepsi ___. ___ gidelim!','Toplam büyümeye devam ediyor!','Tüm bulutları ___! ___ beliriyor. ___!','Gökyüzünde her şey eşit ve dengeli.'],
  zh: ['云朵计算','整整一打云朵飘来了！','___云朵。它们都___。___出发！','总数不断增长！','___所有的云！___出现了。___！','天空中一切都是平等和平衡的。'],
};

S['wp5'] = {
  ar: ['رياضيات القمر','عُد أشعة القمر — ضعف الكمية الليلة!','___ بعضها. ___ أشعة. ___ تلمع!','عُد كل شيء معاً.','___ هو ___! ___ أشعة قمر!','سبعة أشعة قمر تنير الطريق إلى البيت.'],
  da: ['Måne-matematik','Tæl månens stråler — dobbelt så mange i nat!','___ nogle væk. ___ stråler. En ___ skinner!','Tæl alt sammen.','___ er ___! ___ månestråler!','Syv månestråler lyser vejen hjem.'],
  de: ['Mond-Mathe','Zähle die Mondstrahlen — doppelt so viele heute Nacht!','___ welche weg. ___ Strahlen. Ein ___ scheint!','Zähle alles zusammen.','Das ___ ist ___! ___ Mondstrahlen!','Sieben Mondstrahlen leuchten den Weg nach Hause.'],
  es: ['Matemáticas Lunares','¡Cuenta los rayos de luna — el doble esta noche!','¡___ algunos. ___ rayos. ¡Un ___ brilla!','Cuenta todo junto.','¡El ___ es ___! ¡___ rayos de luna!','¡Siete rayos de luna iluminan el camino a casa!'],
  fr: ['Maths de la Lune','Compte les rayons de lune — deux fois plus ce soir !','___ certains. ___ rayons. Un ___ brille !','Compte tout ensemble.','Le ___ est ___ ! ___ rayons de lune !','Sept rayons de lune éclairent le chemin du retour.'],
  it: ['Matematica Lunare','Conta i raggi di luna — il doppio stanotte!','___ alcuni. ___ raggi. Un ___ brilla!','Conta tutto insieme.','Il ___ è ___! ___ raggi di luna!','Sette raggi di luna illuminano la via di casa.'],
  ja: ['おつきさまのさんすう','つきのひかりをかぞえよう — こんやはにばいだよ！','___をいくつかとろう。___のひかり。___がかがやくよ！','ぜんぶいっしょにかぞえよう。','___は___だよ！___のつきのひかり！','ななつのつきのひかりがおうちへのみちをてらすよ。'],
  la: ['Lunae Mathematica','Numera radios lunae — duplex hac nocte!','___ aliquos. ___ radii. ___ lucet!','Omnia simul numera.','___ est ___! ___ radii lunae!','Septem radii lunae viam domum illuminant.'],
  nl: ['Maanrekenen','Tel de maanstralen — vanavond dubbel zoveel!','___ er wat weg. ___ stralen. Een ___ schijnt!','Tel alles bij elkaar.','De ___ is ___! ___ maanstralen!','Zeven maanstralen verlichten de weg naar huis.'],
  pl: ['Matematyka Księżyca','Policz promienie księżyca — dwa razy więcej dziś!','___ kilka. ___ promieni. ___ świeci!','Policz wszystko razem.','___ to ___! ___ promieni księżyca!','Siedem promieni księżyca oświetla drogę do domu.'],
  pt: ['Matemática Lunar','Conte os raios de lua — o dobro esta noite!','___ alguns. ___ raios. Um ___ brilha!','Conte tudo junto.','O ___ é ___! ___ raios de lua!','Sete raios de lua iluminam o caminho de casa.'],
  tr: ['Ay Matematiği','Ay ışınlarını say — bu gece iki katı!','Bazılarını ___. ___ ışın. Bir ___ parlıyor!','Her şeyi birlikte say.','___ ___! ___ ay ışını!','Yedi ay ışını eve giden yolu aydınlatıyor.'],
  zh: ['月亮数学','数数月光——今晚是双倍的！','___掉一些。___束光。一___闪耀！','把所有的一起数。','___是___！___束月光！','七束月光照亮回家的路。'],
};

// ═══ MEDIUM: ANIMAL COUNTING (ac1–ac5) ═══

S['ac1'] = {
  ar: ['مجموع السفاري','صديق أبيض وأسود يمضغ الخيزران!','___ حيوانات. ___ خطوط. ___ يتجول!','ثلاثة صغار يلعبون معاً.','___ في المجموع. كلها ___. ___ يراقب!','الإحصاء الكلي انتهى!'],
  da: ['Safari-sum','En sort og hvid ven tygger bambus!','___ dyr. ___ striber. ___ lusker!','Tre dyreunger leger sammen.','___ i alt. Alle ___. ___ holder øje!','Den samlede optælling er færdig!'],
  de: ['Safari-Summe','Ein schwarz-weißer Freund kaut Bambus!','___ Tiere. ___ Streifen. Der ___ streift!','Drei Tierbabys spielen zusammen.','___ insgesamt. Alle ___. Der ___ beobachtet!','Die Gesamtzählung ist fertig!'],
  es: ['Suma de Safari','¡Un amigo blanco y negro mastica bambú!','¡___ animales. ___ rayas. ¡El ___ merodea!','Tres crías juegan juntas.','¡___ en total. Todos ___. ¡El ___ observa!','¡El conteo total está hecho!'],
  fr: ['Somme de Safari','Un ami noir et blanc mâche du bambou !','___ animaux. ___ rayures. Le ___ rôde !','Trois bébés animaux jouent ensemble.','___ en tout. Tous ___. Le ___ observe !','Le décompte total est fait !'],
  it: ['Somma del Safari','Un amico bianco e nero mastica bambù!','___ animali. ___ strisce. Il ___ si aggira!','Tre cuccioli giocano insieme.','___ in totale. Tutti ___. Il ___ osserva!','Il conteggio totale è fatto!'],
  ja: ['サファリのたしざん','しろくろのともだちがたけをたべているよ！','___ひきのどうぶつ。___のしま。___がうろつくよ！','さんびきのあかちゃんどうぶつがいっしょにあそぶよ。','ぜんぶで___。みんな___。___がみているよ！','かぞえおわったよ！'],
  la: ['Summa Safari','Amicus albus et niger bambusam masticat!','___ animalia. ___ lineae. ___ errat!','Tres catuli simul ludunt.','___ in summa. Omnes ___. ___ spectat!','Computatio totalis facta est!'],
  nl: ['Safaritelling','Een zwart-witte vriend kauwt op bamboe!','___ dieren. ___ strepen. De ___ sluipt!','Drie dierenbaby\'s spelen samen.','___ in totaal. Allemaal ___. De ___ kijkt!','De totale telling is klaar!'],
  pl: ['Suma Safari','Czarno-biały przyjaciel żuje bambus!','___ zwierząt. ___ pasków. ___ się skrada!','Trzy młode bawią się razem.','___ łącznie. Wszystkie ___. ___ obserwuje!','Całkowite liczenie zakończone!'],
  pt: ['Soma do Safári','Um amigo preto e branco mastiga bambu!','___ animais. ___ listras. O ___ espreita!','Três filhotes brincam juntos.','___ no total. Todos ___. O ___ observa!','A contagem total está feita!'],
  tr: ['Safari Toplamı','Siyah beyaz bir arkadaş bambu çiğniyor!','___ hayvan. ___ çizgi. ___ dolaşıyor!','Üç yavru birlikte oynuyor.','Toplamda ___. Hepsi ___. ___ izliyor!','Toplam sayım bitti!'],
  zh: ['动物园总和','一个黑白相间的朋友在嚼竹子！','___只动物。___条条纹。___在徘徊！','三只小动物一起玩耍。','总共___。全都___。___在看！','总计数完成了！'],
};

S['ac2'] = {
  ar: ['حساب الغابة','قط مخطط يستلقي في الظل.','___ يستريح. ___ حيوانات. ___ اعدها!','كل شيء متوازن في الغابة.','___ أصدقاء. ___ واضح. ___ استرح!','سبعة حيوانات تسمي الغابة بيتها.'],
  da: ['Jungle-optælling','En stribet kat lapper sig i skyggen.','___ hviler. ___ dyr. ___ dem alle!','Alt er balanceret i junglen.','___ venner. ___ er klar. ___ hviler!','Syv dyr kalder junglen hjem.'],
  de: ['Dschungel-Zählung','Eine gestreifte Katze räkelt sich im Schatten.','Der ___ ruht. ___ Tiere. ___ sie alle!','Alles ist ausgeglichen im Dschungel.','___ Freunde. Das ___ ist klar. ___ ruhen!','Sieben Tiere nennen den Dschungel ihr Zuhause.'],
  es: ['Conteo de la Selva','Un gato rayado descansa en la sombra.','¡El ___ descansa. ___ animales. ___ todos!','Todo está equilibrado en la selva.','¡___ amigos. El ___ es claro. ___ descansan!','¡Siete animales llaman a la selva hogar!'],
  fr: ['Comptage de la Jungle','Un chat rayé se prélasse à l\'ombre.','Le ___ se repose. ___ animaux. ___ tous !','Tout est équilibré dans la jungle.','___ amis. Le ___ est clair. ___ se reposent !','Sept animaux appellent la jungle leur maison.'],
  it: ['Conteggio della Giungla','Un gatto a strisce si riposa all\'ombra.','Il ___ riposa. ___ animali. ___ tutti!','Tutto è bilanciato nella giungla.','___ amici. Il ___ è chiaro. ___ riposano!','Sette animali chiamano la giungla casa.'],
  ja: ['ジャングルのけいさん','しまもようのねこがかげでのんびりしているよ。','___がやすんでいる。___ひきのどうぶつ。ぜんぶ___！','ジャングルではすべてがバランスがとれているよ。','___にんのともだち。___がわかった。___がやすむよ！','ななひきのどうぶつがジャングルをおうちとよんでいるよ。'],
  la: ['Jungle Computatio','Felis striata in umbra iacet.','___ requiescit. ___ animalia. ___ omnes!','Omnia in jungle librata sunt.','___ amici. ___ clarum est. ___ requiescunt!','Septem animalia jungle domum vocant.'],
  nl: ['Jungletelling','Een gestreepte kat luiert in de schaduw.','De ___ rust. ___ dieren. ___ ze allemaal!','Alles is in balans in de jungle.','___ vrienden. De ___ is duidelijk. ___ rusten!','Zeven dieren noemen de jungle hun thuis.'],
  pl: ['Liczenie w Dżungli','Pręgowany kot wyleguje się w cieniu.','___ odpoczywa. ___ zwierząt. ___ wszystkie!','Wszystko jest zbalansowane w dżungli.','___ przyjaciół. ___ jest jasne. ___ odpoczywają!','Siedem zwierząt nazywa dżunglę domem.'],
  pt: ['Contagem da Selva','Um gato listrado descansa na sombra.','O ___ descansa. ___ animais. ___ todos!','Tudo está equilibrado na selva.','___ amigos. O ___ é claro. ___ descansam!','Sete animais chamam a selva de lar.'],
  tr: ['Orman Sayımı','Çizgili bir kedi gölgede uzanıyor.','___ dinleniyor. ___ hayvan. Hepsini ___!','Ormanda her şey dengeli.','___ arkadaş. ___ açık. ___ dinleniyor!','Yedi hayvan ormanı ev olarak adlandırıyor.'],
  zh: ['丛林计算','一只条纹猫在阴凉处休息。','___在休息。___只动物。___它们全部！','丛林里一切都是平衡的。','___个朋友。___很清楚。___在休息！','七只动物把丛林叫做家。'],
};

S['ac3'] = {
  ar: ['عد البركة','عُد أوراق الزنبق!','___ يتجول. ___ ضفادع. ___ أوراق زنبق!','سبع يعسوبات تمر بسرعة!','___ يراقب. ___ ينمو. ___!','ثمانية مخلوقات تعيش بجانب البركة!'],
  da: ['Damtælling','Tæl åkandebladene!','___ lusker. ___ frøer. ___ åkandeblade!','Syv guldsmede suser forbi!','___ holder øje. ___ vokser. ___!','Otte skabninger bor ved dammen!'],
  de: ['Teichzählung','Zähle die Seerosenblätter!','Der ___ streift. ___ Frösche. ___ Seerosenblätter!','Sieben Libellen flitzen vorbei!','Der ___ beobachtet. Die ___ wächst. ___!','Acht Lebewesen wohnen am Teich!'],
  es: ['Conteo del Estanque','¡Cuenta las hojas de nenúfar!','¡El ___ merodea. ___ ranas. ___ nenúfares!','¡Siete libélulas pasan zumbando!','¡El ___ observa. El ___ crece. ___!','¡Ocho criaturas viven junto al estanque!'],
  fr: ['Comptage de l\'Étang','Comptez les nénuphars !','Le ___ rôde. ___ grenouilles. ___ nénuphars !','Sept libellules filent !','Le ___ observe. Le ___ grandit. ___ !','Huit créatures vivent au bord de l\'étang !'],
  it: ['Conteggio dello Stagno','Conta le foglie di ninfea!','Il ___ si aggira. ___ rane. ___ ninfee!','Sette libellule sfrecciano!','Il ___ osserva. Il ___ cresce. ___!','Otto creature vivono nello stagno!'],
  ja: ['いけのかぞえ','はすのはをかぞえよう！','___がうろつく。___びきのかえる。___まいのはすのは！','ななひきのとんぼがとびすぎるよ！','___がみている。___がふえる。___！','はっぴきのいきものがいけのそばにすんでいるよ！'],
  la: ['Stagni Numeratio','Numera folia nymphaearum!','___ errat. ___ ranae. ___ folia!','Septem libellulae praetervolant!','___ spectat. ___ crescit. ___!','Octo creaturae apud stagnum habitant!'],
  nl: ['Vijvertelling','Tel de waterleliebladeren!','De ___ sluipt. ___ kikkers. ___ waterlelies!','Zeven libellen schieten voorbij!','De ___ kijkt. De ___ groeit. ___!','Acht wezens wonen bij de vijver!'],
  pl: ['Liczenie Stawu','Policz liście lilii wodnych!','___ skrada się. ___ żab. ___ lilii!','Siedem ważek przelatuje!','___ obserwuje. ___ rośnie. ___!','Osiem stworzeń żyje nad stawem!'],
  pt: ['Contagem do Lago','Conte as folhas de nenúfar!','O ___ espreita. ___ sapos. ___ nenúfares!','Sete libélulas passam voando!','O ___ observa. O ___ cresce. ___!','Oito criaturas vivem no lago!'],
  tr: ['Gölet Sayma','Nilüfer yapraklarını say!','___ dolaşıyor. ___ kurbağa. ___ nilüfer!','Yedi yusufçuk hızla geçiyor!','___ izliyor. ___ büyüyor. ___!','Sekiz canlı göletin yanında yaşıyor!'],
  zh: ['池塘计数','数数荷叶！','___在徘徊。___只青蛙。___片荷叶！','七只蜻蜓飞过！','___在看。___在增长。___！','八种生物住在池塘边！'],
};

S['ac4'] = {
  ar: ['رياضيات المزرعة','ثمانية صيصان تفقس في الحظيرة!','___ في الحقل. ___ يرعى. ___!','زائر مخطط يراقب من الخارج.','___ الحيوانات. ___ صيصان. ___ أصدقاء!','الصديق الأبيض والأسود يلوح من الخيزران.'],
  da: ['Gårdmatematik','Otte kyllinger klækkes i laden!','___ på marken. ___ græsser. ___!','En stribet besøgende kigger udefra.','___ dyrene. ___ kyllinger. ___ venner!','Den sort-hvide ven vinker fra bambussen.'],
  de: ['Bauernhof-Mathe','Acht Küken schlüpfen in der Scheune!','___ auf dem Feld. Der ___ grast. ___!','Ein gestreifter Besucher schaut von draußen.','___ die Tiere. ___ Küken. ___ Freunde!','Der schwarz-weiße Freund winkt vom Bambus.'],
  es: ['Matemáticas de Granja','¡Ocho pollitos nacen en el granero!','¡___ en el campo. El ___ pasta. ___!','Un visitante rayado observa desde fuera.','¡___ los animales. ___ pollitos. ___ amigos!','¡El amigo blanco y negro saluda desde el bambú!'],
  fr: ['Maths de la Ferme','Huit poussins éclosent dans la grange !','___ dans le champ. Le ___ broute. ___ !','Un visiteur rayé observe de l\'extérieur.','___ les animaux. ___ poussins. ___ amis !','L\'ami noir et blanc fait signe depuis le bambou.'],
  it: ['Matematica della Fattoria','Otto pulcini nascono nel fienile!','___ nel campo. Il ___ pascola. ___!','Un visitatore a strisce guarda da fuori.','___ gli animali. ___ pulcini. ___ amici!','L\'amico bianco e nero saluta dal bambù.'],
  ja: ['のうじょうのさんすう','はっぴきのひよこがなやでかえったよ！','はたけに___。___がくさをたべる。___！','しまもようのおきゃくさんがそとからみているよ。','どうぶつを___。___ぴきのひよこ。___にんのともだち！','しろくろのともだちがたけからてをふっているよ。'],
  la: ['Mathematica Villae','Octo pulli in horreo nascuntur!','___ in agro. ___ pascit. ___!','Visitator striatus foris spectat.','___ animalia. ___ pulli. ___ amici!','Amicus albus et niger e bambusa salutat.'],
  nl: ['Boerderijrekenen','Acht kuikentjes komen uit in de schuur!','___ in het veld. De ___ graast. ___!','Een gestreepte bezoeker kijkt van buiten.','___ de dieren. ___ kuikens. ___ vrienden!','De zwart-witte vriend zwaait vanuit het bamboe.'],
  pl: ['Matematyka Farmy','Osiem kurcząt wyklewa się w stodole!','___ na polu. ___ pasie się. ___!','Pręgowany gość obserwuje z zewnątrz.','___ zwierząt. ___ kurcząt. ___ przyjaciół!','Czarno-biały przyjaciel macha z bambusa.'],
  pt: ['Matemática da Fazenda','Oito pintinhos nascem no celeiro!','___ no campo. O ___ pasta. ___!','Um visitante listrado observa de fora.','___ os animais. ___ pintinhos. ___ amigos!','O amigo preto e branco acena do bambu.'],
  tr: ['Çiftlik Matematiği','Ahırda sekiz civciv çıkıyor!','Tarlada ___. ___ otluyor. ___!','Çizgili bir ziyaretçi dışarıdan izliyor.','Hayvanları ___. ___ civciv. ___ arkadaş!','Siyah beyaz arkadaş bambudan el sallıyor.'],
  zh: ['农场数学','八只小鸡在谷仓里孵出来了！','田野里___。___在吃草。___！','一个条纹访客从外面看着。','___动物。___只小鸡。___个朋友！','黑白相间的朋友从竹子那边挥手。'],
};

S['ac5'] = {
  ar: ['عد حديقة الحيوان','ثلاث تذاكر لحديقة الحيوان!','___ حيوانات. ___ اعدها جميعاً. ___!','الإجمالي النهائي على اللوحة.','___ و___ يلعبان. ___ يهتفون!','عدها مرة أخرى!'],
  da: ['Zootælling','Tre billetter til zoo!','___ dyr. ___ dem alle. ___!','Den endelige total er på tavlen.','___ og ___ leger. ___ jubler!','Tæl dem én gang mere!'],
  de: ['Zoo-Zählung','Drei Eintrittskarten für den Zoo!','___ Tiere. ___ sie alle. ___!','Die Endsumme steht auf der Tafel.','Der ___ und ___ spielen. ___ jubeln!','Zähle sie noch einmal!'],
  es: ['Conteo del Zoo','¡Tres entradas para el zoo!','¡___ animales. ___ todos. ___!','El total final está en el tablero.','¡El ___ y ___ juegan. ___ aplauden!','¡Cuéntalos una vez más!'],
  fr: ['Comptage du Zoo','Trois billets pour le zoo !','___ animaux. ___ tous. ___ !','Le total final est au tableau.','Le ___ et ___ jouent. ___ applaudissent !','Comptez-les encore une fois !'],
  it: ['Conteggio dello Zoo','Tre biglietti per lo zoo!','___ animali. ___ tutti. ___!','Il totale finale è sulla lavagna.','Il ___ e ___ giocano. ___ esultano!','Contali ancora una volta!'],
  ja: ['どうぶつえんのかぞえ','どうぶつえんのチケットがさんまい！','___ひきのどうぶつ。ぜんぶ___。___！','さいしゅうごうけいがボードにあるよ。','___と___があそぶ。___がおうえん！','もういっかいかぞえよう！'],
  la: ['Computatio Horti Zoologici','Tria tessera ad hortum zoologicum!','___ animalia. ___ omnes. ___!','Summa finalis in tabula est.','___ et ___ ludunt. ___ plaudunt!','Iterum numera!'],
  nl: ['Dierentuintelling','Drie kaartjes voor de dierentuin!','___ dieren. ___ ze allemaal. ___!','Het eindtotaal staat op het bord.','De ___ en ___ spelen. ___ juichen!','Tel ze nog een keer!'],
  pl: ['Liczenie w Zoo','Trzy bilety do zoo!','___ zwierząt. ___ wszystkie. ___!','Końcowy wynik jest na tablicy.','___ i ___ się bawią. ___ kibicują!','Policz je jeszcze raz!'],
  pt: ['Contagem do Zoológico','Três ingressos para o zoológico!','___ animais. ___ todos. ___!','O total final está no quadro.','O ___ e ___ brincam. ___ torcem!','Conte-os mais uma vez!'],
  tr: ['Hayvanat Bahçesi Sayma','Hayvanat bahçesine üç bilet!','___ hayvan. Hepsini ___. ___!','Son toplam tahtada.','___ ve ___ oynuyor. ___ tezahürat yapıyor!','Bir kez daha say!'],
  zh: ['动物园计数','三张动物园的门票！','___只动物。___它们全部。___！','最终总数在板上。','___和___在玩。___在欢呼！','再数一遍！'],
};

// ═══ MEDIUM: FRUIT COUNTING (fc1–fc5) ═══

S['fc1'] = {
  ar: ['مجموع البستان','التقط الفاكهة المستديرة الحمراء من الشجرة!','___ بنفسجية، كلها ___، ___!','ثلاث سلال تمتلئ بسرعة.','فاكهة ___ حلوة. ___ ينمو. ___!','الحصاد الكلي وصل!'],
  da: ['Frugthave-sum','Pluk de runde røde frugter fra træet!','Lilla ___, alle ___, ___!','Tre kurve fyldes hurtigt.','Sød ___ frugt. ___ vokser. ___!','Den samlede høst er klar!'],
  de: ['Obsthof-Summe','Pflücke die runden roten Früchte vom Baum!','Lila ___, alle ___, ___!','Drei Körbe füllen sich schnell.','Süße ___ Frucht. Die ___ wächst. ___!','Die Gesamternte ist da!'],
  es: ['Suma del Huerto','¡Recoge la fruta roja redonda del árbol!','¡___ moradas, todas ___, ___!','Tres cestas se llenan rápido.','¡Fruta ___ dulce. El ___ crece. ___!','¡La cosecha total llegó!'],
  fr: ['Somme du Verger','Cueille les fruits ronds rouges de l\'arbre !','___ violets, tous ___, ___ !','Trois paniers se remplissent vite.','Fruit ___ sucré. Le ___ grandit. ___ !','La récolte totale est là !'],
  it: ['Somma del Frutteto','Raccogli il frutto rotondo rosso dall\'albero!','___ viola, tutti ___, ___!','Tre cestini si riempiono rapidamente.','Frutto ___ dolce. Il ___ cresce. ___!','Il raccolto totale è arrivato!'],
  ja: ['はたけのたしざん','きからまるいあかいくだものをとろう！','むらさきの___、ぜんぶ___、___！','みっつのかごがすぐにいっぱいになるよ。','あまい___のくだもの。___がふえる。___！','ぜんぶのしゅうかくがおわったよ！'],
  la: ['Summa Pomarii','Collige fructum rotundum rubrum ab arbore!','Purpurea ___, omnia ___, ___!','Tres cophini celeriter implentur.','Dulcis ___ fructus. ___ crescit. ___!','Messis totalis adest!'],
  nl: ['Boomgaardsom','Pluk het ronde rode fruit van de boom!','Paarse ___, allemaal ___, ___!','Drie manden vullen zich snel.','Zoet ___ fruit. De ___ groeit. ___!','De totale oogst is binnen!'],
  pl: ['Suma Sadu','Zbierz okrągły czerwony owoc z drzewa!','Fioletowe ___, wszystkie ___, ___!','Trzy kosze szybko się napełniają.','Słodki owoc ___. ___ rośnie. ___!','Całkowite zbiory są gotowe!'],
  pt: ['Soma do Pomar','Colha a fruta redonda vermelha da árvore!','___ roxas, todas ___, ___!','Três cestos enchem rápido.','Fruta ___ doce. O ___ cresce. ___!','A colheita total chegou!'],
  tr: ['Bahçe Toplamı','Ağaçtan yuvarlak kırmızı meyveyi topla!','Mor ___, hepsi ___, ___!','Üç sepet hızla doluyor.','Tatlı ___ meyve. ___ büyüyor. ___!','Toplam hasat tamam!'],
  zh: ['果园总和','从树上摘圆圆的红色水果！','紫色的___，全都___，___！','三个篮子很快就装满了。','甜蜜的___水果。___在增长。___！','总收成来了！'],
};

S['fc2'] = {
  ar: ['رياضيات السوق','عناقيد بنفسجية من الفاكهة تملأ الطاولة.','___ حمراء مستديرة، ثمانية أخرى ___! ___ ينمو.','سبع صناديق مكدسة عالياً!','___ فاكهة، ___ كبير، ___!','فاكهة خضراء حلوة كبيرة للتحلية!'],
  da: ['Markedsmatematik','Lilla frugtklaser fylder boden.','Runde røde ___, otte mere ___! ___ vokser.','Syv kasser stablet højt!','___ frugt, en stor ___, ___!','En stor sød grøn frugt til dessert!'],
  de: ['Marktmathe','Lila Fruchttrauben füllen den Stand.','Runde rote ___, acht mehr ___! Die ___ wächst.','Sieben Kisten hoch gestapelt!','___ Frucht, ein großes ___, ___!','Eine große süße grüne Frucht zum Nachtisch!'],
  es: ['Matemáticas del Mercado','Racimos morados de fruta llenan el puesto.','¡___ rojos redondos, ocho más ___! ¡El ___ crece!','¡Siete cajas apiladas!','¡___ frutas, un gran ___, ___!','¡Una gran fruta verde dulce de postre!'],
  fr: ['Maths du Marché','Des grappes violettes remplissent l\'étal.','Des ___ rouges ronds, huit de plus ___ ! Le ___ grandit.','Sept caisses empilées !','___ fruits, un gros ___, ___ !','Un gros fruit vert sucré pour le dessert !'],
  it: ['Matematica del Mercato','Grappoli viola di frutta riempiono la bancarella.','___ rossi rotondi, otto di più ___! Il ___ cresce.','Sette cassette impilate!','___ frutta, un grande ___, ___!','Un grande frutto verde dolce per dessert!'],
  ja: ['いちばのさんすう','むらさきのくだもののふさがおみせをうめるよ。','まるいあかい___、もうはっこ___！___がふえる。','ななつのはこがたかくつまれている！','___のくだもの、おおきな___、___！','デザートにおおきなあまいみどりのくだもの！'],
  la: ['Mathematica Fori','Uvae purpureae mensam implent.','Rotunda rubra ___, octo plures ___! ___ crescit.','Septem arcae alte accumulatae!','___ fructus, magna ___, ___!','Magnus dulcis viridis fructus ad bellaria!'],
  nl: ['Marktrekenen','Paarse druiventrossen vullen de kraam.','Ronde rode ___, acht meer ___! De ___ groeit.','Zeven kratten hoog gestapeld!','___ fruit, een grote ___, ___!','Een groot zoet groen fruit als dessert!'],
  pl: ['Matematyka Targu','Fioletowe grona owoców wypełniają stragan.','Okrągłe czerwone ___, osiem więcej ___! ___ rośnie.','Siedem skrzynek piętrzy się!','___ owoców, duży ___, ___!','Duży słodki zielony owoc na deser!'],
  pt: ['Matemática do Mercado','Cachos roxos de frutas enchem a banca.','___ vermelhos redondos, mais oito ___! O ___ cresce.','Sete caixas empilhadas!','___ frutas, um grande ___, ___!','Uma grande fruta verde doce de sobremesa!'],
  tr: ['Market Matematiği','Mor meyve salkımları tezgahı dolduruyor.','Yuvarlak kırmızı ___, sekiz tane daha ___! ___ büyüyor.','Yedi kasa üst üste!','___ meyve, büyük bir ___, ___!','Tatlı olarak büyük tatlı yeşil bir meyve!'],
  zh: ['市场数学','紫色的水果串装满了摊位。','圆圆的红色___，又多了八个___！___在增长。','七个箱子堆得很高！','___个水果，一个大___，___！','一个又大又甜的绿色水果当甜点！'],
};

S['fc3'] = {
  ar: ['عد النزهة','فاكهة خضراء كبيرة هي القطعة المركزية!','___ فاكهة، مستديرة ___، ___!','عُد الوجبات الخفيفة!','___ بنفسجية، ___ ينمو، ___!','الفاكهة الحمراء المستديرة تنهي النزهة!'],
  da: ['Picnic-tælling','En stor grøn frugt er midtpunktet!','___ frugt, rund ___, ___!','Tæl snacksene!','Lilla ___, ___ vokser, ___!','Den runde røde frugt afslutter picnicen!'],
  de: ['Picknick-Zählung','Eine große grüne Frucht ist das Herzstück!','___ Frucht, runde ___, ___!','Zähle die Snacks!','Lila ___, die ___ wächst, ___!','Die runde rote Frucht beendet das Picknick!'],
  es: ['Conteo del Picnic','¡Una gran fruta verde es la pieza central!','¡___ fruta, redonda ___, ___!','¡Cuenta las meriendas!','¡___ moradas, el ___ crece, ___!','¡La fruta roja redonda termina el picnic!'],
  fr: ['Comptage du Pique-nique','Un gros fruit vert est la pièce maîtresse !','___ fruit, rond ___, ___ !','Comptez les en-cas !','___ violets, le ___ grandit, ___ !','Le fruit rouge rond termine le pique-nique !'],
  it: ['Conteggio del Picnic','Un grande frutto verde è il pezzo forte!','___ frutta, rotonda ___, ___!','Conta gli spuntini!','___ viola, il ___ cresce, ___!','Il frutto rosso rotondo conclude il picnic!'],
  ja: ['ピクニックかぞえ','おおきなみどりのくだものがめだまだよ！','___のくだもの、まるい___、___！','おやつをかぞえよう！','むらさきの___、___がふえる、___！','まるいあかいくだものがピクニックをしめくくるよ！'],
  la: ['Numeratio Convivii','Magnus viridis fructus primarius est!','___ fructus, rotundus ___, ___!','Numera cibaria!','Purpurea ___, ___ crescit, ___!','Rotundus ruber fructus convivium finit!'],
  nl: ['Picknicktelling','Een groot groen fruit is het middelpunt!','___ fruit, rond ___, ___!','Tel de snacks!','Paarse ___, de ___ groeit, ___!','Het ronde rode fruit maakt de picknick af!'],
  pl: ['Liczenie Pikniku','Duży zielony owoc jest główną atrakcją!','___ owoców, okrągły ___, ___!','Policz przekąski!','Fioletowe ___, ___ rośnie, ___!','Okrągły czerwony owoc kończy piknik!'],
  pt: ['Contagem do Piquenique','Uma grande fruta verde é a peça central!','___ frutas, redonda ___, ___!','Conte os lanchinhos!','___ roxas, o ___ cresce, ___!','A fruta vermelha redonda encerra o piquenique!'],
  tr: ['Piknik Sayma','Büyük yeşil bir meyve ana parça!','___ meyve, yuvarlak ___, ___!','Atıştırmalıkları say!','Mor ___, ___ büyüyor, ___!','Yuvarlak kırmızı meyve pikniği bitirir!'],
  zh: ['野餐计数','一个大绿色水果是中心装饰！','___个水果，圆圆的___，___！','数数零食！','紫色的___，___在增长，___！','圆圆的红色水果结束了野餐！'],
};

S['fc4'] = {
  ar: ['فاكهة الحديقة','عُد الفاكهة في الحديقة!','___ حلوة، ___ بنفسجية، ___!','ثمانية قطع فاكهة على الأرض!','مستديرة ___، سبع أخرى! ___!','ثلاث قطف مثالية لأخذها للمنزل.'],
  da: ['Havefrugt','Tæl frugterne i haven!','En sød ___, lilla ___, ___!','Otte frugter på jorden!','Runde ___, syv mere! ___!','Tre perfekte pluk til at tage med hjem.'],
  de: ['Gartenfrucht','Zähle die Früchte im Garten!','Eine süße ___, lila ___, ___!','Acht Früchte am Boden!','Runde ___, sieben mehr! ___!','Drei perfekte Pflücke zum Mitnehmen.'],
  es: ['Fruta del Jardín','¡Cuenta la fruta en el jardín!','¡Una ___ dulce, ___ morada, ___!','¡Ocho frutas en el suelo!','¡___ redondas, siete más! ___!','Tres frutas perfectas para llevar a casa.'],
  fr: ['Fruit du Jardin','Compte les fruits dans le jardin !','Un ___ sucré, ___ violet, ___ !','Huit fruits au sol !','Des ___ ronds, sept de plus ! ___ !','Trois cueillettes parfaites à ramener.'],
  it: ['Frutta del Giardino','Conta la frutta nel giardino!','Un ___ dolce, ___ viola, ___!','Otto frutti a terra!','___ rotondi, sette di più! ___!','Tre raccolte perfette da portare a casa.'],
  ja: ['にわのくだもの','にわのくだものをかぞえよう！','あまい___、むらさきの___、___！','はっこのくだものがじめんにあるよ！','まるい___、もうななつ！___！','おうちにもってかえるみっつのかんぺきなくだもの。'],
  la: ['Fructus Horti','Numera fructus in horto!','Dulcis ___, purpurea ___, ___!','Octo fructus in solo!','Rotundi ___, septem plures! ___!','Tres perfecti lectus domum portandi.'],
  nl: ['Tuinfruit','Tel het fruit in de tuin!','Een zoete ___, paarse ___, ___!','Acht vruchten op de grond!','Ronde ___, zeven meer! ___!','Drie perfecte plukken om mee naar huis te nemen.'],
  pl: ['Owoce z Ogrodu','Policz owoce w ogrodzie!','Słodki ___, fioletowe ___, ___!','Osiem owoców na ziemi!','Okrągłe ___, siedem więcej! ___!','Trzy idealne zbiory do zabrania do domu.'],
  pt: ['Fruta do Jardim','Conte as frutas no jardim!','Uma ___ doce, ___ roxa, ___!','Oito frutas no chão!','___ redondas, mais sete! ___!','Três colheitas perfeitas para levar para casa.'],
  tr: ['Bahçe Meyvesi','Bahçedeki meyveleri say!','Tatlı bir ___, mor ___, ___!','Yerde sekiz meyve!','Yuvarlak ___, yedi tane daha! ___!','Eve götürmek için üç mükemmel meyve.'],
  zh: ['花园水果','数数花园里的水果！','一个甜___，紫色的___，___！','地上有八个水果！','圆圆的___，又多了七个！___！','三个完美的水果带回家。'],
};

S['fc5'] = {
  ar: ['مجموع العصير','سبع مكونات للعصير!','___ ينمو! ___، مستديرة ___!','فاكهة بنفسجية تُمزج!','___ بقيت، ___ حلوة، ___!','العصير الكلي ممزوج!'],
  da: ['Smoothie-sum','Syv ingredienser til smoothien!','___ vokser! ___, en rund ___!','Lilla frugt blendes!','___ tilbage, en sød ___, ___!','Den samlede smoothie er blandet!'],
  de: ['Smoothie-Summe','Sieben Zutaten für den Smoothie!','Die ___ wächst! ___, ein rundes ___!','Lila Frucht wird gemixt!','___ übrig, ein süßes ___, ___!','Der Gesamtsmoothie ist gemixt!'],
  es: ['Suma del Batido','¡Siete ingredientes para el batido!','¡El ___ crece! ___, ¡un ___ redondo!','¡Fruta morada se mezcla!','¡___ quedan, un ___ dulce, ___!','¡El batido total está mezclado!'],
  fr: ['Somme du Smoothie','Sept ingrédients pour le smoothie !','Le ___ grandit ! ___, un ___ rond !','Du fruit violet se mélange !','___ restent, un ___ sucré, ___ !','Le smoothie total est mixé !'],
  it: ['Somma del Frullato','Sette ingredienti per il frullato!','Il ___ cresce! ___, un ___ rotondo!','Frutta viola si frulla!','___ rimasti, un ___ dolce, ___!','Il frullato totale è pronto!'],
  ja: ['スムージーのたしざん','スムージーのざいりょうがななつ！','___がふえる！___、まるい___！','むらさきのくだものがミックスされるよ！','___のこり、あまい___、___！','ぜんぶのスムージーがミックスされたよ！'],
  la: ['Summa Potionis','Septem ingredientia ad potionem!','___ crescit! ___, rotundum ___!','Fructus purpureus miscetur!','___ manent, dulce ___, ___!','Potio totalis mixta est!'],
  nl: ['Smoothiesom','Zeven ingrediënten voor de smoothie!','De ___ groeit! ___, een ronde ___!','Paars fruit wordt gemixt!','___ over, een zoete ___, ___!','De totale smoothie is gemixt!'],
  pl: ['Suma Smoothie','Siedem składników na smoothie!','___ rośnie! ___, okrągły ___!','Fioletowy owoc się miksuje!','___ zostało, słodki ___, ___!','Całkowite smoothie jest zmiksowane!'],
  pt: ['Soma do Smoothie','Sete ingredientes para o smoothie!','O ___ cresce! ___, um ___ redondo!','Fruta roxa é misturada!','___ restam, um ___ doce, ___!','O smoothie total está pronto!'],
  tr: ['Smoothie Toplamı','Smoothie için yedi malzeme!','___ büyüyor! ___, yuvarlak bir ___!','Mor meyve karıştırılıyor!','___ kaldı, tatlı bir ___, ___!','Toplam smoothie hazır!'],
  zh: ['冰沙总和','冰沙的七种原料！','___在增长！___，圆圆的___！','紫色水果被搅拌了！','还剩___，甜蜜的___，___！','全部冰沙搅拌好了！'],
};

// ═══ MEDIUM: TOY COUNTING (tc1–tc5) ═══

S['tc1'] = {
  ar: ['رف الألعاب','مكعبات البناء تتكدس على الرف!','___ تتدحرج. ___ مكعبات. ___!','مركبة كبيرة تهدر عبر السجادة.','___ ترقص. ___ ينمو. ___!','العدد الكلي للألعاب!'],
  da: ['Legetøjshylde','Byggeklodser stables på hylden!','En ___ ruller forbi. ___ klodser. ___!','Et stort køretøj brummer hen over tæppet.','En ___ danser. ___ vokser. ___!','Det samlede antal legetøj!'],
  de: ['Spielzeugregal','Bausteine stapeln sich auf dem Regal!','Ein ___ rollt vorbei. ___ Bausteine. ___!','Ein großes Fahrzeug brummt über den Teppich.','Ein ___ tanzt. Die ___ wächst. ___!','Die Gesamtzahl der Spielsachen!'],
  es: ['Estante de Juguetes','¡Bloques de construcción se apilan en el estante!','¡Un ___ rueda. ___ bloques. ___!','¡Un gran vehículo retumba por la alfombra!','¡Un ___ baila. ¡El ___ crece. ___!','¡El conteo total de juguetes!'],
  fr: ['Étagère à Jouets','Des blocs s\'empilent sur l\'étagère !','Un ___ roule. ___ blocs. ___ !','Un grand véhicule gronde sur le tapis.','Un ___ danse. Le ___ grandit. ___ !','Le nombre total de jouets !'],
  it: ['Scaffale dei Giocattoli','I mattoncini si impilano sullo scaffale!','Un ___ rotola. ___ mattoncini. ___!','Un grande veicolo romba sul tappeto.','Un ___ balla. Il ___ cresce. ___!','Il conteggio totale dei giocattoli!'],
  ja: ['おもちゃのたな','つみきがたなにつまれていくよ！','___がころがる。___こつみき。___！','おおきなのりものがじゅうたんのうえをはしるよ。','___がおどる。___がふえる。___！','おもちゃのぜんぶのかず！'],
  la: ['Pluteus Ludorum','Cubi in pluteo accumulantur!','___ volvitur. ___ cubi. ___!','Magnum vehiculum per tapetum tonat.','___ saltat. ___ crescit. ___!','Numerus totalis ludorum!'],
  nl: ['Speelgoedplank','Bouwblokken stapelen zich op de plank!','Een ___ rolt voorbij. ___ blokken. ___!','Een groot voertuig rijdt over het tapijt.','Een ___ danst. De ___ groeit. ___!','Het totale aantal speelgoed!'],
  pl: ['Półka z Zabawkami','Klocki piętrzą się na półce!','___ się toczy. ___ klocków. ___!','Duży pojazd przejeżdża po dywanie.','___ tańczy. ___ rośnie. ___!','Całkowita liczba zabawek!'],
  pt: ['Prateleira de Brinquedos','Blocos de construção se empilham na prateleira!','Um ___ rola. ___ blocos. ___!','Um grande veículo ruge pelo tapete.','Um ___ dança. O ___ cresce. ___!','O número total de brinquedos!'],
  tr: ['Oyuncak Rafı','Yapı blokları rafta yığılıyor!','Bir ___ yuvarlanıyor. ___ blok. ___!','Büyük bir araç halının üzerinde gürülüyor.','Bir ___ dans ediyor. ___ büyüyor. ___!','Toplam oyuncak sayısı!'],
  zh: ['玩具架','积木堆在架子上！','一个___滚过来。___块积木。___！','一辆大车在地毯上轰隆隆地开过。','一个___在跳舞。___在增长。___！','玩具的总数！'],
};

S['tc2'] = {
  ar: ['مجموع غرفة اللعب','تشو تشو! القطار يدور حول المسار.','___ متكدسة. ___ ألعاب. ___ ينضم!','سبع ألعاب تصطف!','___ كبير، ___. ___ ينمو!','دمية صغيرة تدور في النهاية!'],
  da: ['Legestue-sum','Choo choo! Toget kører rundt på banen.','___ stablet op. ___ legetøj. En ___ slutter sig til!','Syv stykker legetøj stiller op!','En stor ___, ___. ___ vokser!','En lille figur piruetter til sidst!'],
  de: ['Spielzimmer-Summe','Tschutschu! Die Spielzeugeisenbahn fährt im Kreis.','___ aufgestapelt. ___ Spielsachen. Ein ___ kommt dazu!','Sieben Spielsachen stellen sich auf!','Ein großes ___, ___. Die ___ wächst!','Eine kleine Figur pirouettiert am Ende!'],
  es: ['Suma del Cuarto de Juegos','¡Chuu chuu! El tren de juguete recorre la vía.','¡___ apilados. ___ juguetes. ¡Un ___ se une!','¡Siete juguetes se alinean!','¡Un gran ___, ___. ¡El ___ crece!','¡Una figurita da una pirueta al final!'],
  fr: ['Somme de la Salle de Jeu','Tchou tchou ! Le train fait le tour du circuit.','___ empilés. ___ jouets. Un ___ rejoint !','Sept jouets s\'alignent !','Un gros ___, ___. Le ___ grandit !','Une petite figurine fait une pirouette à la fin !'],
  it: ['Somma della Stanza dei Giochi','Ciuf ciuf! Il trenino gira intorno alla pista.','___ impilati. ___ giocattoli. Un ___ si unisce!','Sette giocattoli si mettono in fila!','Un grande ___, ___. Il ___ cresce!','Una piccola figura fa una piroetta alla fine!'],
  ja: ['プレイルームのたしざん','シュッシュッ！おもちゃのでんしゃがせんろをまわるよ。','___がつまれた。___こおもちゃ。___がなかまいり！','ななつのおもちゃがならぶよ！','おおきな___、___。___がふえる！','ちいさなにんぎょうがさいごにくるくるまわるよ！'],
  la: ['Summa Ludorum','Vapores! Tramen circum viam currit.','___ accumulata. ___ ludi. ___ se iungit!','Septem ludi in ordine!','Magnus ___, ___. ___ crescit!','Parva figura in fine pirouettat!'],
  nl: ['Speelkamersom','Toet toet! De speelgoedtrein rijdt rond.','___ opgestapeld. ___ speelgoed. Een ___ doet mee!','Zeven speelgoedjes staan op een rij!','Een grote ___, ___. De ___ groeit!','Een klein figuurtje draait een pirouette aan het eind!'],
  pl: ['Suma Pokoju Zabaw','Czu czu! Pociąg zabawka jeździ po torze.','___ ułożone. ___ zabawek. ___ dołącza!','Siedem zabawek stoi w rzędzie!','Duży ___, ___. ___ rośnie!','Mała figurka robi piruet na końcu!'],
  pt: ['Soma da Sala de Brincar','Tchuc tchuc! O trenzinho percorre a pista.','___ empilhados. ___ brinquedos. Um ___ se junta!','Sete brinquedos se alinham!','Um grande ___, ___. O ___ cresce!','Uma pequena figura faz uma pirueta no final!'],
  tr: ['Oyun Odası Toplamı','Çuf çuf! Oyuncak tren rayda dönüyor.','___ üst üste. ___ oyuncak. Bir ___ katılıyor!','Yedi oyuncak sıraya giriyor!','Büyük bir ___, ___. ___ büyüyor!','Küçük bir figür sonda peri dansı yapıyor!'],
  zh: ['游戏室总和','呜呜！玩具火车绕着轨道跑。','___堆起来。___个玩具。一个___加入了！','七个玩具排成一排！','一个大___，___。___在增长！','一个小人偶最后做了个旋转！'],
};

S['tc3'] = {
  ar: ['موكب الألعاب','الدمية الصغيرة تقود الموكب!','___ كبير، ___ ينمو، ___!','عُد كل الألعاب المتحركة!','___ تتكدس. ___ ألعاب. ___!','القطار يتشو تشو إلى النهاية!'],
  da: ['Legetøjsparade','Den lille figur leder paraden!','En stor ___, ___ vokser, en ___!','Tæl alt det marcherende legetøj!','___ stables højt. ___ legetøj. ___!','Toget tuut-tuuter til slut!'],
  de: ['Spielzeugparade','Die kleine Figur führt die Parade an!','Ein großes ___, die ___ wächst, ein ___!','Zähle alle marschierenden Spielsachen!','___ stapeln sich hoch. ___ Spielsachen. ___!','Der Zug tuckert zum Schluss!'],
  es: ['Desfile de Juguetes','¡La figurita lidera el desfile!','¡Un gran ___, el ___ crece, un ___!','¡Cuenta todos los juguetes marchando!','¡___ se apilan. ___ juguetes. ___!','¡El tren llega al final!'],
  fr: ['Parade de Jouets','La petite figurine mène le défilé !','Un gros ___, le ___ grandit, un ___ !','Comptez tous les jouets qui défilent !','___ s\'empilent. ___ jouets. ___ !','Le train fait tchou-tchou jusqu\'à la fin !'],
  it: ['Parata dei Giocattoli','La piccola figura guida la parata!','Un grande ___, il ___ cresce, un ___!','Conta tutti i giocattoli in marcia!','___ si impilano. ___ giocattoli. ___!','Il trenino arriva ciuf ciuf alla fine!'],
  ja: ['おもちゃパレード','ちいさなにんぎょうがパレードをひっぱるよ！','おおきな___、___がふえる、___！','こうしんしているおもちゃをぜんぶかぞえよう！','___がたかくつまれる。___こおもちゃ。___！','でんしゃがシュッシュッとゴールするよ！'],
  la: ['Pompa Ludorum','Parva figura pompam ducit!','Magnus ___, ___ crescit, ___!','Numera omnia ludi gradientes!','___ alte accumulantur. ___ ludi. ___!','Tramen ad finem currit!'],
  nl: ['Speelgoedparade','Het kleine figuurtje leidt de parade!','Een grote ___, de ___ groeit, een ___!','Tel al het marcherende speelgoed!','___ stapelen hoog. ___ speelgoed. ___!','De trein toetert naar het einde!'],
  pl: ['Parada Zabawek','Mała figurka prowadzi paradę!','Duży ___, ___ rośnie, ___!','Policz wszystkie maszerujące zabawki!','___ piętrzą się. ___ zabawek. ___!','Pociąg jedzie czu czu do końca!'],
  pt: ['Desfile de Brinquedos','A pequena figura lidera o desfile!','Um grande ___, o ___ cresce, um ___!','Conte todos os brinquedos marchando!','___ se empilham. ___ brinquedos. ___!','O trenzinho chega ao final!'],
  tr: ['Oyuncak Geçidi','Küçük figür geçidi yönetiyor!','Büyük bir ___, ___ büyüyor, bir ___!','Yürüyen tüm oyuncakları say!','___ yığılıyor. ___ oyuncak. ___!','Tren sona çuf çuf yaparak varıyor!'],
  zh: ['玩具游行','小人偶领导游行！','一个大___，___在增长，一个___！','数数所有行进的玩具！','___堆得很高。___个玩具。___！','火车呜呜地到达终点！'],
};

S['tc4'] = {
  ar: ['ترتيب الصندوق','ثمانية ألعاب لوضعها بعيداً!','___ يدخل. ___ أخرى. ___!','مركبة كبيرة تركن في الزاوية.','___، ___، ___!','كل المكعبات مرتبة بدقة!'],
  da: ['Oprydning','Otte stykker legetøj skal ryddes op!','___ puttes væk. ___ mere. ___!','Et stort køretøj parkerer i hjørnet.','___, ___, ___!','Alle klodser er stablet pænt!'],
  de: ['Aufräumbox','Acht Spielsachen zum Aufräumen!','Das ___ kommt rein. ___ mehr. ___!','Ein großes Fahrzeug parkt in der Ecke.','Das ___, das ___, ___!','Alle Bausteine sind ordentlich gestapelt!'],
  es: ['Caja Ordenada','¡Ocho juguetes para guardar!','¡El ___ entra. ___ más. ___!','Un gran vehículo se estaciona en la esquina.','¡El ___, el ___, ___!','¡Todos los bloques están apilados!'],
  fr: ['Boîte de Rangement','Huit jouets à ranger !','Le ___ rentre. ___ de plus. ___ !','Un grand véhicule se gare dans le coin.','Le ___, le ___, ___ !','Tous les blocs sont bien empilés !'],
  it: ['Scatola in Ordine','Otto giocattoli da mettere via!','Il ___ entra. ___ di più. ___!','Un grande veicolo parcheggia nell\'angolo.','Il ___, il ___, ___!','Tutti i mattoncini sono impilati bene!'],
  ja: ['おかたづけ','はっこのおもちゃをかたづけよう！','___がはいる。あと___。___！','おおきなのりものがすみにとまるよ。','___、___、___！','つみきがぜんぶきれいにつまれたよ！'],
  la: ['Arca Ordinis','Octo ludi reponendi!','___ intrat. ___ plures. ___!','Magnum vehiculum in angulo sistit.','___, ___, ___!','Omnes cubi ordinate accumulati!'],
  nl: ['Opruimdoos','Acht speelgoedjes opruimen!','De ___ gaat erin. ___ meer. ___!','Een groot voertuig parkeert in de hoek.','De ___, de ___, ___!','Alle blokken staan netjes gestapeld!'],
  pl: ['Pudełko Porządkowe','Osiem zabawek do schowania!','___ wchodzi. ___ więcej. ___!','Duży pojazd parkuje w rogu.','___, ___, ___!','Wszystkie klocki ładnie ułożone!'],
  pt: ['Caixa Arrumada','Oito brinquedos para guardar!','O ___ entra. ___ mais. ___!','Um grande veículo estaciona no canto.','O ___, o ___, ___!','Todos os blocos empilhados direitinho!'],
  tr: ['Kutu Düzeni','Sekiz oyuncak kaldırılacak!','___ giriyor. ___ daha. ___!','Büyük bir araç köşeye park ediyor.','___, ___, ___!','Tüm bloklar düzgünce istiflenmiş!'],
  zh: ['收纳盒','八个玩具要收起来！','___放进去了。还有___。___！','一辆大车停在角落里。','___、___、___！','所有积木都整齐地堆好了！'],
};

S['tc5'] = {
  ar: ['سباق الألعاب','عُد المتسابقين!','___ ألعاب تتسابق. ___ كبير. ___!','تم عد الإجمالي!','___، مكعبات في كل مكان، ___!','سبع ألعاب تعبر خط النهاية!'],
  da: ['Legetøjsræs','Tæl racerne!','___ legetøj kører. En stor ___. En ___!','Totalen er talt!','En ___, klodser overalt, ___!','Syv stykker legetøj krydser målstregen!'],
  de: ['Spielzeugrennen','Zähle die Rennfahrer!','___ Spielsachen rasen. Ein großes ___. Ein ___!','Die Summe ist gezählt!','Ein ___, überall Bausteine, ___!','Sieben Spielsachen überqueren die Ziellinie!'],
  es: ['Carrera de Juguetes','¡Cuenta los corredores!','¡___ juguetes corriendo. Un gran ___. ¡Un ___!','¡El total está contado!','¡Un ___, bloques por todos lados, ___!','¡Siete juguetes cruzan la meta!'],
  fr: ['Course de Jouets','Comptez les coureurs !','___ jouets en course. Un grand ___. Un ___ !','Le total est compté !','Un ___, des blocs partout, ___ !','Sept jouets franchissent la ligne d\'arrivée !'],
  it: ['Corsa dei Giocattoli','Conta i corridori!','___ giocattoli in gara. Un grande ___. Un ___!','Il totale è contato!','Un ___, mattoncini ovunque, ___!','Sette giocattoli tagliano il traguardo!'],
  ja: ['おもちゃレース','レーサーをかぞえよう！','___こおもちゃがレース。おおきな___。___！','ごうけいがかぞえられたよ！','___、つみきがいたるところに、___！','ななつのおもちゃがゴールをきるよ！'],
  la: ['Ludorum Certamen','Numera cursores!','___ ludi currunt. Magnus ___. ___!','Summa numerata est!','___, cubi ubique, ___!','Septem ludi lineam ultimam transeunt!'],
  nl: ['Speelgoedrace','Tel de racers!','___ speelgoedjes racen. Een grote ___. Een ___!','Het totaal is geteld!','Een ___, blokken overal, ___!','Zeven speelgoedjes passeren de finish!'],
  pl: ['Wyścig Zabawek','Policz zawodników!','___ zabawek ściga się. Duży ___. ___!','Suma jest policzona!','___, klocki wszędzie, ___!','Siedem zabawek przekracza metę!'],
  pt: ['Corrida de Brinquedos','Conte os corredores!','___ brinquedos correndo. Um grande ___. Um ___!','O total está contado!','Um ___, blocos por todo lado, ___!','Sete brinquedos cruzam a linha de chegada!'],
  tr: ['Oyuncak Yarışı','Yarışçıları say!','___ oyuncak yarışıyor. Büyük bir ___. Bir ___!','Toplam sayıldı!','Bir ___, her yerde bloklar, ___!','Yedi oyuncak bitiş çizgisini geçiyor!'],
  zh: ['玩具赛车','数数赛车手！','___个玩具在比赛。一个大___。一个___！','总数数好了！','一个___，到处都是积木，___！','七个玩具冲过终点线！'],
};

// ═══ MEDIUM: GARDEN COUNTING (gc1–gc5) ═══

S['gc1'] = {
  ar: ['مجموع الأزهار','أزهار جميلة تتفتح في الحديقة!','___، سبع أخرى. ___!','مجموعة كاملة من الأزهار معاً!','___ ينمو. ___ زهرة. ___!','ثلاث باقات مثالية!'],
  da: ['Blomstersum','Smukke blomster blomstrer i haven!','En ___, syv mere. ___!','En hel buket blomster sammen!','___ vokser. ___ blomster. ___!','Tre perfekte buketter!'],
  de: ['Blumensumme','Wunderschöne Blumen blühen im Garten!','Eine ___, sieben mehr. ___!','Ein ganzer Strauß Blumen zusammen!','Die ___ wächst. ___ Blumen. ___!','Drei perfekte Sträuße!'],
  es: ['Suma de Flores','¡Hermosas flores florecen en el jardín!','¡Una ___, siete más. ___!','¡Un ramo entero de flores juntas!','¡El ___ crece. ___ flores. ___!','¡Tres ramos perfectos!'],
  fr: ['Somme des Fleurs','De belles fleurs fleurissent dans le jardin !','Un ___, sept de plus. ___ !','Tout un bouquet de fleurs ensemble !','Le ___ grandit. ___ fleurs. ___ !','Trois bouquets parfaits !'],
  it: ['Somma dei Fiori','Bellissimi fiori sbocciano nel giardino!','Un ___, sette di più. ___!','Un intero mazzo di fiori insieme!','Il ___ cresce. ___ fiori. ___!','Tre bouquet perfetti!'],
  ja: ['おはなのたしざん','きれいなおはなが にわに さいているよ！','___、あとななつ。___！','おはながいっぱいまとまっているよ！','___がふえる。___ほんのおはな。___！','みっつのかんぺきなはなたば！'],
  la: ['Summa Florum','Pulchri flores in horto florent!','___, septem plures. ___!','Totus fasciculus florum simul!','___ crescit. ___ flores. ___!','Tres perfecti fasciculi!'],
  nl: ['Bloemensom','Prachtige bloemen bloeien in de tuin!','Een ___, zeven meer. ___!','Een heel boeket bloemen samen!','De ___ groeit. ___ bloemen. ___!','Drie perfecte boeketten!'],
  pl: ['Suma Kwiatów','Piękne kwiaty kwitną w ogrodzie!','___, siedem więcej. ___!','Cały bukiet kwiatów razem!','___ rośnie. ___ kwiatów. ___!','Trzy idealne bukiety!'],
  pt: ['Soma das Flores','Lindas flores desabrocham no jardim!','Uma ___, mais sete. ___!','Um buquê inteiro de flores juntas!','O ___ cresce. ___ flores. ___!','Três buquês perfeitos!'],
  tr: ['Çiçek Toplamı','Güzel çiçekler bahçede açıyor!','Bir ___, yedi tane daha. ___!','Bir buket dolusu çiçek bir arada!','___ büyüyor. ___ çiçek. ___!','Üç mükemmel buket!'],
  zh: ['花朵总和','美丽的花朵在花园里盛开！','一___，又多了七个。___！','一整束花在一起！','___在增长。___朵花。___！','三束完美的花！'],
};

S['gc2'] = {
  ar: ['حساب البذور','جزء رقيق من الزهرة يمسك بالنسيم.','___ تتفتح. ___ بتلات. ___!','عُد الشتلات!','___ تنمو. ___ زهرة. ___!','عد الحديقة الكلي!'],
  da: ['Frø-optælling','En fin blomsterdel fanger brisen.','___ åbner sig. ___ kronblade. En ___!','Tæl frøplanterne!','___ vokser. ___ blomster. ___!','Den samlede have-tælling!'],
  de: ['Samenzählung','Ein zarter Blumenteil fängt die Brise.','___ öffnen sich. ___ Blütenblätter. Ein ___!','Zähle die Setzlinge!','___ wachsen. ___ Blumen. ___!','Die Gesamtgartenzählung!'],
  es: ['Conteo de Semillas','Una delicada parte de flor atrapa la brisa.','¡___ se abren. ___ pétalos. ¡Un ___!','¡Cuenta las plántulas!','¡___ crecen. ___ flores. ___!','¡El conteo total del jardín!'],
  fr: ['Comptage de Graines','Une partie délicate de la fleur attrape la brise.','___ s\'ouvrent. ___ pétales. Un ___ !','Comptez les semis !','___ poussent. ___ fleurs. ___ !','Le comptage total du jardin !'],
  it: ['Conteggio dei Semi','Una parte delicata del fiore prende la brezza.','___ si aprono. ___ petali. Un ___!','Conta le piantine!','___ crescono. ___ fiori. ___!','Il conteggio totale del giardino!'],
  ja: ['たねのけいさん','はなのくきがそよかぜにゆれるよ。','___がひらく。___まいのはなびら。___！','なえをかぞえよう！','___がそだつ。___ほんのおはな。___！','にわのぜんぶのかぞえ！'],
  la: ['Seminum Computatio','Delicata floris pars auram capit.','___ aperiuntur. ___ petala. ___!','Numera plantulas!','___ crescunt. ___ flores. ___!','Computatio horti totalis!'],
  nl: ['Zaadtelling','Een teer bloemdeel vangt de bries.','___ openen zich. ___ blaadjes. Een ___!','Tel de zaailingen!','___ groeien. ___ bloemen. ___!','De totale tuintelling!'],
  pl: ['Liczenie Nasion','Delikatna część kwiatu łapie wiatr.','___ się otwierają. ___ płatków. ___!','Policz sadzonki!','___ rosną. ___ kwiatów. ___!','Całkowite liczenie ogrodu!'],
  pt: ['Contagem de Sementes','Uma parte delicada da flor pega a brisa.','___ se abrem. ___ pétalas. Um ___!','Conte as mudas!','___ crescem. ___ flores. ___!','A contagem total do jardim!'],
  tr: ['Tohum Sayımı','Çiçeğin zarif bir parçası esintide sallanıyor.','___ açılıyor. ___ yaprak. Bir ___!','Fideleri say!','___ büyüyor. ___ çiçek. ___!','Toplam bahçe sayımı!'],
  zh: ['种子计算','花朵的一个精致部分随风飘动。','___开放了。___片花瓣。一个___！','数数幼苗！','___在生长。___朵花。___！','花园的总计数！'],
};

S['gc3'] = {
  ar: ['عد الأواني','سبعة أواني نباتات على عتبة النافذة!','___ أواني. ___ تتفتح. ___!','جزء رقيق يطفو للأسفل.','___ تتفتح. ___ و___!','عدها جميعاً مرة أخرى!'],
  da: ['Potte-tælling','Syv plantepotter på vindueskarmen!','___ potter. En ___ blomstrer. ___!','En fin del svæver ned.','___ åbner sig. ___ og ___!','Tæl dem alle én gang mere!'],
  de: ['Topfzählung','Sieben Blumentöpfe auf der Fensterbank!','___ Töpfe. Eine ___ blüht. ___!','Ein zartes Teil schwebt herunter.','___ öffnen sich. ___ und ___!','Zähle sie alle noch einmal!'],
  es: ['Conteo de Macetas','¡Siete macetas en el alféizar!','¡___ macetas. Una ___ florece. ___!','Una parte delicada flota hacia abajo.','¡___ se abren. ___ y ___!','¡Cuéntalos todos una vez más!'],
  fr: ['Comptage de Pots','Sept pots sur le rebord de la fenêtre !','___ pots. Une ___ fleurit. ___ !','Une partie délicate descend doucement.','___ s\'ouvrent. ___ et ___ !','Comptez-les tous encore une fois !'],
  it: ['Conteggio dei Vasi','Sette vasi sul davanzale!','___ vasi. Un ___ fiorisce. ___!','Una parte delicata scende fluttuando.','___ si aprono. ___ e ___!','Contali tutti ancora una volta!'],
  ja: ['うえきばちかぞえ','ななつのうえきばちがまどべにあるよ！','___このうえきばち。___がさくよ。___！','くきがしたにただようよ。','___がひらく。___と___！','もういっかいぜんぶかぞえよう！'],
  la: ['Vasorum Numeratio','Septem vasa in fenestra!','___ vasa. ___ floret. ___!','Delicata pars deorsum volitat.','___ aperiuntur. ___ et ___!','Iterum omnia numera!'],
  nl: ['Pottentelling','Zeven plantenpotten op de vensterbank!','___ potten. Een ___ bloeit. ___!','Een teer deeltje dwarrelt naar beneden.','___ openen. ___ en ___!','Tel ze allemaal nog een keer!'],
  pl: ['Liczenie Doniczek','Siedem doniczek na parapecie!','___ doniczek. ___ kwitnie. ___!','Delikatna część spada w dół.','___ się otwierają. ___ i ___!','Policz je wszystkie jeszcze raz!'],
  pt: ['Contagem de Vasos','Sete vasos no parapeito da janela!','___ vasos. Uma ___ floresce. ___!','Uma parte delicada flutua para baixo.','___ se abrem. ___ e ___!','Conte todos mais uma vez!'],
  tr: ['Saksı Sayma','Pencere pervazında yedi saksı!','___ saksı. Bir ___ açıyor. ___!','Zarif bir parça aşağı süzülüyor.','___ açılıyor. ___ ve ___!','Hepsini bir kez daha say!'],
  zh: ['花盆计数','窗台上有七个花盆！','___个花盆。一个___在开花。___！','一个精致的部分飘落下来。','___开放了。___和___！','再把它们全数一遍！'],
};

S['gc4'] = {
  ar: ['إزهار المطر','ثلاث شتلات تظهر بعد المطر!','___ ينمو. ___ تتكشف. ___!','ثمانية قطرات تسقي الحديقة.','___ من الأزهار! ___ تتفتح. ___!','سبع براعم جاهزة للتفتح!'],
  da: ['Regnblomstring','Tre frøplanter popper op efter regnen!','___ vokser. En ___ folder sig ud. ___!','Otte dråber vander haven.','En ___ af blomster! ___ blomstrer. ___!','Syv knopper er klar til at åbne!'],
  de: ['Regenblüte','Drei Setzlinge sprießen nach dem Regen!','Die ___ wächst. Eine ___ entfaltet sich. ___!','Acht Tropfen bewässern den Garten.','Eine ___ Blumen! ___ blühen. ___!','Sieben Knospen sind bereit aufzugehen!'],
  es: ['Floración de Lluvia','¡Tres plántulas brotan después de la lluvia!','¡El ___ crece. Una ___ se despliega. ___!','Ocho gotas riegan el jardín.','¡Un ___ de flores! ___ florecen. ___!','¡Siete capullos listos para abrir!'],
  fr: ['Floraison de Pluie','Trois semis poussent après la pluie !','Le ___ grandit. Une ___ se déploie. ___ !','Huit gouttes arrosent le jardin.','Un ___ de fleurs ! ___ fleurissent. ___ !','Sept bourgeons sont prêts à s\'ouvrir !'],
  it: ['Fioritura di Pioggia','Tre piantine spuntano dopo la pioggia!','Il ___ cresce. Un ___ si apre. ___!','Otto gocce innaffiano il giardino.','Un ___ di fiori! ___ fioriscono. ___!','Sette boccioli sono pronti ad aprirsi!'],
  ja: ['あめのかいか','あめのあとにみっつのなえがでてきたよ！','___がそだつ。___がひらく。___！','はっつのしずくがにわにみずをやるよ。','おはなの___！___がさく。___！','ななつのつぼみがひらくじゅんびができたよ！'],
  la: ['Florescentia Pluviae','Tres plantulae post pluviam surgunt!','___ crescit. ___ se aperit. ___!','Octo guttae hortum rigant.','___ florum! ___ florent. ___!','Septem gemmae aperiri paratae sunt!'],
  nl: ['Regenbloei','Drie zaailingen komen op na de regen!','De ___ groeit. Een ___ ontvouwt zich. ___!','Acht druppels bewateren de tuin.','Een ___ bloemen! ___ bloeien. ___!','Zeven knoppen staan klaar om open te gaan!'],
  pl: ['Deszczowe Kwitnienie','Trzy sadzonki wyrastają po deszczu!','___ rośnie. ___ się rozwija. ___!','Osiem kropel podlewa ogród.','___ kwiatów! ___ kwitnie. ___!','Siedem pąków gotowych do otwarcia!'],
  pt: ['Floração da Chuva','Três mudas brotam após a chuva!','O ___ cresce. Uma ___ se abre. ___!','Oito gotas regam o jardim.','Um ___ de flores! ___ florescem. ___!','Sete botões prontos para abrir!'],
  tr: ['Yağmur Çiçeklenmesi','Yağmurdan sonra üç fide çıkıyor!','___ büyüyor. Bir ___ açılıyor. ___!','Sekiz damla bahçeyi suluyor.','Bir ___ çiçek! ___ açıyor. ___!','Yedi tomurcuk açılmaya hazır!'],
  zh: ['雨后开花','雨后三棵幼苗冒出来了！','___在生长。一个___展开了。___！','八滴雨水浇灌花园。','一___花！___朵开放了。___！','七个花蕾准备好要开了！'],
};

S['gc5'] = {
  ar: ['رياضيات الحديقة','ثمانية صفوف من الأزهار!','___ و___ تتفتح. ___!','لوحة العد الكلية تمتلئ.','___، سبع أخرى، ___!','مجموعة كاملة من الأزهار لأخذها للداخل!'],
  da: ['Havematematik','Otte rækker blomster!','___ og ___ blomstrer. ___!','Den samlede optælling fyldes op.','En ___, syv mere, en ___!','En hel buket blomster at tage med ind!'],
  de: ['Gartenmathe','Acht Reihen Blumen!','___ und ___ blühen. ___!','Die Gesamttafel füllt sich.','Eine ___, sieben mehr, ein ___!','Ein ganzer Strauß Blumen zum Reinnehmen!'],
  es: ['Matemáticas del Jardín','¡Ocho filas de flores!','¡___ y ___ florecen. ___!','El tablero de conteo se llena.','¡Una ___, siete más, una ___!','¡Un ramo entero de flores para llevar adentro!'],
  fr: ['Maths du Jardin','Huit rangées de fleurs !','___ et ___ fleurissent. ___ !','Le tableau des totaux se remplit.','Un ___, sept de plus, un ___ !','Tout un bouquet de fleurs à rentrer !'],
  it: ['Matematica del Giardino','Otto file di fiori!','___ e ___ fioriscono. ___!','La lavagna dei totali si riempie.','Un ___, sette di più, un ___!','Un intero mazzo di fiori da portare dentro!'],
  ja: ['にわのさんすう','はちれつのおはな！','___と___がさく。___！','ごうけいのボードがうまるよ。','___、もうななつ、___！','おうちにいれるおはながいっぱい！'],
  la: ['Mathematica Horti','Octo ordines florum!','___ et ___ florent. ___!','Tabula summae impletur.','___, septem plures, ___!','Totus fasciculus florum intro ferendus!'],
  nl: ['Tuinrekenen','Acht rijen bloemen!','___ en ___ bloeien. ___!','Het totaalbord vult zich.','Een ___, zeven meer, een ___!','Een heel boeket bloemen om mee naar binnen te nemen!'],
  pl: ['Matematyka Ogrodu','Osiem rzędów kwiatów!','___ i ___ kwitną. ___!','Tablica z sumą się zapełnia.','___, siedem więcej, ___!','Cały bukiet kwiatów do zabrania do środka!'],
  pt: ['Matemática do Jardim','Oito fileiras de flores!','___ e ___ florescem. ___!','O quadro de contagem se enche.','Uma ___, mais sete, uma ___!','Um buquê inteiro de flores para levar para dentro!'],
  tr: ['Bahçe Matematiği','Sekiz sıra çiçek!','___ ve ___ açıyor. ___!','Toplam panosu doluyor.','Bir ___, yedi tane daha, bir ___!','İçeri almak için koca bir buket çiçek!'],
  zh: ['花园数学','八排花！','___和___开放了。___！','总数板越来越满。','一___，又多了七个，一___！','一整束花带进屋里！'],
};

// ═══ HARD: NUMBER PUZZLES (np1–np5) ═══

S['np1'] = {
  ar: ['غرفة الألغاز','لغز صعب ينتظر على الباب!','___ أدلة! ___ الرمز، ___ القفل!','عشرون مفتاحاً معلقة على الحائط.','___ و___ يتطابقان! حان وقت ___!','كل شيء يساوي الإجابة الصحيحة!'],
  da: ['Gåderum','Et tricky puslespil venter på døren!','___ ledetråde! ___ koden, ___ låsen!','Tyve nøgler hænger på væggen.','___ og ___ matcher! Tid til ___!','Alt giver det rigtige svar!'],
  de: ['Rätselraum','Ein kniffliges Rätsel wartet an der Tür!','___ Hinweise! ___ den Code, ___ das Schloss!','Zwanzig Schlüssel hängen an der Wand.','___ und ___ passen! Zeit zu ___!','Alles ergibt die richtige Antwort!'],
  es: ['Sala de Acertijos','¡Un acertijo difícil espera en la puerta!','¡___ pistas! ¡___ el código, ___ la cerradura!','Veinte llaves cuelgan de la pared.','¡___ y ___ coinciden! ¡Hora de ___!','¡Todo es igual a la respuesta correcta!'],
  fr: ['Salle d\'Énigmes','Une énigme attend sur la porte !','___ indices ! ___ le code, ___ le verrou !','Vingt clés pendent au mur.','___ et ___ correspondent ! Temps de ___ !','Tout égale la bonne réponse !'],
  it: ['Stanza degli Enigmi','Un rompicapo attende sulla porta!','___ indizi! ___ il codice, ___ la serratura!','Venti chiavi appese al muro.','___ e ___ corrispondono! Tempo di ___!','Tutto è uguale alla risposta giusta!'],
  ja: ['なぞなぞべや','ドアにむずかしいパズルがまっているよ！','___のヒント！___コード、___ロック！','にじゅうのかぎがかべにかかっているよ。','___と___がぴったり！___のじかん！','ぜんぶただしいこたえになるよ！'],
  la: ['Camera Aenigmatum','Aenigma difficile ad ianuam exspectat!','___ indicia! ___ codicem, ___ seram!','Viginti claves in pariete pendent.','___ et ___ conveniunt! Tempus ___!','Omnia rectum responsum aequant!'],
  nl: ['Raadselkamer','Een lastig puzzel wacht op de deur!','___ aanwijzingen! ___ de code, ___ het slot!','Twintig sleutels hangen aan de muur.','___ en ___ passen! Tijd om ___!','Alles is gelijk aan het juiste antwoord!'],
  pl: ['Pokój Zagadek','Trudna zagadka czeka na drzwiach!','___ wskazówek! ___ kod, ___ zamek!','Dwadzieścia kluczy wisi na ścianie.','___ i ___ pasują! Czas na ___!','Wszystko równa się właściwej odpowiedzi!'],
  pt: ['Sala de Enigmas','Um quebra-cabeça difícil espera na porta!','___ pistas! ___ o código, ___ a fechadura!','Vinte chaves penduradas na parede.','___ e ___ combinam! Hora de ___!','Tudo é igual à resposta certa!'],
  tr: ['Bulmaca Odası','Kapıda zor bir bulmaca bekliyor!','___ ipucu! ___ kodu, ___ kilidi!','Duvarda yirmi anahtar asılı.','___ ve ___ eşleşiyor! ___ zamanı!','Her şey doğru cevaba eşit!'],
  zh: ['谜题房间','门上有一个难题在等着！','___条线索！___密码，___锁！','墙上挂着二十把钥匙。','___和___匹配！该___了！','一切都等于正确答案！'],
};

S['np2'] = {
  ar: ['رياضيات المتاهة','اثنا عشر مساراً تلتف وتدور!','___ للأمام! ال___! يتكون ___!','اقسم المسار — حان وقت القسمة!','___ النتيجة، ___ أكثر! ___!','تم حل اللغز!'],
  da: ['Labyrint-matematik','Tolv stier snor sig!','___ forude! ___! En ___ dannes!','Del stien — tid til at dividere!','___ scoren, ___ mere! ___!','Puslespillet er løst!'],
  de: ['Labyrinth-Mathe','Zwölf Wege schlängeln sich!','___ voraus! Das ___! Ein ___ entsteht!','Teile den Weg — Zeit zum Teilen!','___ die Punktzahl, ___ mehr! ___!','Das Rätsel ist gelöst!'],
  es: ['Matemáticas del Laberinto','¡Doce caminos giran y tuercen!','¡___ adelante! ¡El ___! ¡Se forma un ___!','¡Divide el camino — hora de dividir!','¡___ la puntuación, ___ más! ___!','¡El rompecabezas está resuelto!'],
  fr: ['Maths du Labyrinthe','Douze chemins serpentent !','___ devant ! Le ___ ! Un ___ se forme !','Divise le chemin — c\'est l\'heure de diviser !','___ le score, ___ de plus ! ___ !','Le puzzle est résolu !'],
  it: ['Matematica del Labirinto','Dodici sentieri si attorcigliano!','___ avanti! Il ___! Un ___ si forma!','Dividi il sentiero — tempo di dividere!','___ il punteggio, ___ di più! ___!','Il rompicapo è risolto!'],
  ja: ['めいろさんすう','じゅうにのみちがくねくねしているよ！','___がまえに！___！___ができる！','みちをわけよう — わりざんのじかん！','___てん、もっと___！___！','パズルがとけたよ！'],
  la: ['Mathematica Labyrinthi','Duodecim viae torquent!','___ ante! ___! ___ formatur!','Divide viam — tempus dividendi!','___ puncta, ___ plura! ___!','Aenigma solutum est!'],
  nl: ['Doolhofrekenen','Twaalf paden draaien en kronkelen!','___ vooruit! De ___! Een ___ vormt zich!','Splits het pad — tijd om te delen!','___ de score, ___ meer! ___!','De puzzel is opgelost!'],
  pl: ['Matematyka Labiryntu','Dwanaście ścieżek kręci się!','___ do przodu! ___! ___ się tworzy!','Podziel ścieżkę — czas na dzielenie!','___ wynik, ___ więcej! ___!','Zagadka rozwiązana!'],
  pt: ['Matemática do Labirinto','Doze caminhos se torcem!','___ à frente! O ___! Um ___ se forma!','Divida o caminho — hora de dividir!','___ a pontuação, ___ mais! ___!','O quebra-cabeça está resolvido!'],
  tr: ['Labirent Matematiği','On iki yol dönüp buruluyor!','___ ileride! ___! Bir ___ oluşuyor!','Yolu böl — bölme zamanı!','___ puanı, ___ daha! ___!','Bulmaca çözüldü!'],
  zh: ['迷宫数学','十二条路弯弯曲曲！','___在前方！___！形成了___！','分开路——该除法了！','___分，再多___！___！','谜题解开了！'],
};

S['np3'] = {
  ar: ['مهمة المفتاح','ضاعف المفاتيح لفتح الباب!','___ الرمز! ___ مفاتيح. ___!','أحد عشر جوهرة تضيء القفل.','___ يناسب! ___ أكثر! ___!','ثلاثة أضعاف الكنز بالداخل!'],
  da: ['Nøglejagt','Fordobl nøglerne for at åbne døren!','___ koden! ___ nøgler. ___!','Elleve ædelstene lyser på låsen.','___ passer! ___ mere! ___!','Tredobbelt skat indeni!'],
  de: ['Schlüsselsuche','Verdopple die Schlüssel zum Öffnen!','___ den Code! ___ Schlüssel. ___!','Elf Edelsteine leuchten am Schloss.','Der ___ passt! ___ mehr! ___!','Dreifacher Schatz drinnen!'],
  es: ['Búsqueda de Llaves','¡Duplica las llaves para abrir la puerta!','¡___ el código! ___ llaves. ___!','Once gemas iluminan la cerradura.','¡El ___ encaja! ¡___ más! ___!','¡Triple el tesoro adentro!'],
  fr: ['Quête de Clés','Double les clés pour ouvrir la porte !','___ le code ! ___ clés. ___ !','Onze gemmes illuminent la serrure.','Le ___ correspond ! ___ de plus ! ___ !','Triple le trésor à l\'intérieur !'],
  it: ['Missione Chiave','Raddoppia le chiavi per aprire la porta!','___ il codice! ___ chiavi. ___!','Undici gemme illuminano la serratura.','Il ___ entra! ___ di più! ___!','Triplo il tesoro dentro!'],
  ja: ['かぎのぼうけん','かぎをにばいにしてドアをあけよう！','___コード！___かぎ。___！','じゅういちのほうせきがロックをてらすよ。','___がぴったり！もっと___！___！','なかにさんばいのたからもの！'],
  la: ['Quaestio Clavis','Duplica claves ut ianuam aperias!','___ codicem! ___ claves. ___!','Undecim gemmae seram illuminant.','___ convenit! ___ plures! ___!','Triplus thesaurus intus!'],
  nl: ['Sleutelzoektocht','Verdubbel de sleutels om de deur te openen!','___ de code! ___ sleutels. ___!','Elf edelstenen verlichten het slot.','De ___ past! ___ meer! ___!','Drievoudige schat binnen!'],
  pl: ['Misja Klucza','Podwój klucze, żeby otworzyć drzwi!','___ kod! ___ kluczy. ___!','Jedenaście klejnotów oświetla zamek.','___ pasuje! ___ więcej! ___!','Potrójny skarb w środku!'],
  pt: ['Busca da Chave','Dobre as chaves para abrir a porta!','___ o código! ___ chaves. ___!','Onze gemas iluminam a fechadura.','O ___ encaixa! ___ mais! ___!','Triplo o tesouro lá dentro!'],
  tr: ['Anahtar Görevi','Kapıyı açmak için anahtarları ikiye katla!','___ kodu! ___ anahtar. ___!','On bir mücevher kilidi aydınlatıyor.','___ uyuyor! ___ daha! ___!','İçeride üç kat hazine!'],
  zh: ['钥匙任务','把钥匙加倍来开门！','___密码！___把钥匙。___！','十一颗宝石照亮了锁。','___合适！再多___！___！','里面有三倍的宝藏！'],
};

S['np4'] = {
  ar: ['لغز الساعة','ثلاثة أضعاف العقارب على الساعة السحرية!','___ تطابق! ___ تدور. ال___!','اثنا عشر رقماً تتوهج على الوجه.','___ أكثر! ___ الساعات! ___!','أحد عشر رنيناً يرن!'],
  da: ['Ur-puslespil','Tredobl viserne på det magiske ur!','___ matcher! ___ drejer. ___!','Tolv tal gløder på skiven.','___ mere! ___ timerne! ___!','Elleve klokkeslæt ringer ud!'],
  de: ['Uhren-Rätsel','Verdreifache die Zeiger der Zauberuhr!','___ passen! ___ drehen sich. Das ___!','Zwölf Zahlen leuchten auf dem Ziffernblatt.','___ mehr! ___ die Stunden! ___!','Elf Glockenschläge erklingen!'],
  es: ['Rompecabezas del Reloj','¡Triplica las manecillas del reloj mágico!','¡___ coinciden! ___ giran. ¡El ___!','Doce números brillan en la esfera.','¡___ más! ¡___ las horas! ___!','¡Once campanadas suenan!'],
  fr: ['Puzzle de l\'Horloge','Triple les aiguilles de l\'horloge magique !','___ correspondent ! ___ tournent. Le ___ !','Douze chiffres brillent sur le cadran.','___ de plus ! ___ les heures ! ___ !','Onze carillons retentissent !'],
  it: ['Puzzle dell\'Orologio','Triplica le lancette dell\'orologio magico!','___ corrispondono! ___ girano. Il ___!','Dodici numeri brillano sul quadrante.','___ di più! ___ le ore! ___!','Undici rintocchi suonano!'],
  ja: ['とけいパズル','まほうのとけいのはりをさんばいにしよう！','___がぴったり！___がまわる。___！','じゅうにのすうじがもじばんにかがやくよ。','もっと___！___じかん！___！','じゅういちかいかねがなるよ！'],
  la: ['Aenigma Horologii','Triplica manus horologii magici!','___ conveniunt! ___ rotant. ___!','Duodecim numeri in facie lucent.','___ plures! ___ horas! ___!','Undecim tintinnabula resonant!'],
  nl: ['Klokpuzzel','Verdrievoudig de wijzers van de magische klok!','___ passen! ___ draaien. De ___!','Twaalf cijfers gloeien op de wijzerplaat.','___ meer! ___ de uren! ___!','Elf klokslagen klinken!'],
  pl: ['Zagadka Zegara','Potrój wskazówki magicznego zegara!','___ pasują! ___ się kręcą. ___!','Dwanaście cyfr świeci na tarczy.','___ więcej! ___ godziny! ___!','Jedenaście dzwonów bije!'],
  pt: ['Quebra-cabeça do Relógio','Triplique os ponteiros do relógio mágico!','___ combinam! ___ giram. O ___!','Doze números brilham no mostrador.','___ mais! ___ as horas! ___!','Onze badaladas soam!'],
  tr: ['Saat Bulmacası','Sihirli saatin kollarını üçe katla!','___ eşleşiyor! ___ dönüyor. ___!','Kadranın üzerinde on iki sayı parlıyor.','___ daha! ___ saatleri! ___!','On bir çan çalıyor!'],
  zh: ['时钟谜题','把魔法时钟的指针变成三倍！','___匹配！___旋转。___！','表盘上十二个数字发光。','再多___！___小时！___！','十一声钟响起来了！'],
};

S['np5'] = {
  ar: ['قفل الكنز','كل شيء يجب أن يكون متوازناً لفتح القفل!','___ الأرقام! ___ يدور. ___!','ضاعف الجواهر لفتحه.','___ و___ يتوهجان! ___!','عشرون قطعة ذهبية تنسكب!'],
  da: ['Skattens lås','Alt skal balancere for at åbne låsen!','___ tallene! ___ drejer. ___!','Fordobl ædelstene for at låse op.','___ og ___ gløder! ___!','Tyve guldmønter vælter ud!'],
  de: ['Schatztruhe','Alles muss ausgewogen sein zum Öffnen!','___ die Zahlen! ___ dreht sich. ___!','Verdopple die Edelsteine zum Öffnen.','___ und ___ leuchten! ___!','Zwanzig Goldmünzen purzeln heraus!'],
  es: ['Cerradura del Tesoro','¡Todo debe estar equilibrado para abrir!','¡___ los números! ___ gira. ___!','¡Duplica las gemas para abrirlo!','¡___ y ___ brillan! ___!','¡Veinte monedas de oro caen!'],
  fr: ['Coffre au Trésor','Tout doit être équilibré pour ouvrir !','___ les nombres ! ___ tourne. ___ !','Double les gemmes pour l\'ouvrir.','___ et ___ brillent ! ___ !','Vingt pièces d\'or s\'écoulent !'],
  it: ['Scrigno del Tesoro','Tutto deve essere bilanciato per aprire!','___ i numeri! ___ gira. ___!','Raddoppia le gemme per aprirlo.','___ e ___ brillano! ___!','Venti monete d\'oro cadono fuori!'],
  ja: ['たからのロック','バランスをとってロックをあけよう！','___すうじ！___がまわる。___！','ほうせきをにばいにしてあけよう。','___と___がかがやく！___！','にじゅうのきんかがあふれるよ！'],
  la: ['Sera Thesauri','Omnia aequari debent ut sera aperiatur!','___ numeros! ___ rotat. ___!','Duplica gemmas ut aperias.','___ et ___ lucent! ___!','Viginti aurei effunduntur!'],
  nl: ['Schatkistslot','Alles moet in balans zijn om te openen!','___ de getallen! ___ draait. ___!','Verdubbel de edelstenen om te openen.','___ en ___ gloeien! ___!','Twintig gouden munten rollen eruit!'],
  pl: ['Zamek Skarbu','Wszystko musi być zrównoważone, żeby otworzyć!','___ liczby! ___ się kręci. ___!','Podwój klejnoty, żeby otworzyć.','___ i ___ świecą! ___!','Dwadzieścia złotych monet wysypuje się!'],
  pt: ['Fechadura do Tesouro','Tudo deve estar equilibrado para abrir!','___ os números! ___ gira. ___!','Dobre as gemas para abrir.','___ e ___ brilham! ___!','Vinte moedas de ouro caem!'],
  tr: ['Hazine Kilidi','Kilidi açmak için her şey dengeli olmalı!','___ sayıları! ___ dönüyor. ___!','Açmak için mücevherleri ikiye katla.','___ ve ___ parlıyor! ___!','Yirmi altın sikke dökülüyor!'],
  zh: ['宝藏锁','一切都必须平衡才能打开锁！','___数字！___旋转。___！','把宝石加倍来打开。','___和___发光！___！','二十枚金币洒落出来！'],
};

// ═══ HARD: ADDITION FUN (af1–af5) ═══

S['af1'] = {
  ar: ['مهمة الجمع','حان وقت البدء بالجمع!','___ و___ يصنعان ___!','كم المجموع الكلي؟','___ أكثر! ___ إجمالاً. ___!','كل شيء متوازن!'],
  da: ['Sumjagt','Tid til at lægge sammen!','___ og ___ giver en ___!','Hvor mange i alt?','___ mere! ___ i alt. ___!','Alt er i balance!'],
  de: ['Summensuche','Zeit zum Addieren!','___ und ___ ergeben ein ___!','Wie viele insgesamt?','___ mehr! ___ insgesamt. ___!','Alles ist ausgeglichen!'],
  es: ['Misión Suma','¡Es hora de sumar!','¡___ y ___ hacen un ___!','¿Cuántos en total?','¡___ más! ___ en total. ___!','¡Todo está equilibrado!'],
  fr: ['Quête de Somme','C\'est l\'heure d\'additionner !','___ et ___ font un ___ !','Combien au total ?','___ de plus ! ___ en tout. ___ !','Tout est équilibré !'],
  it: ['Missione Somma','È ora di sommare!','___ e ___ fanno un ___!','Quanti in totale?','___ di più! ___ in tutto. ___!','Tutto è bilanciato!'],
  ja: ['たしざんのぼうけん','たしざんをはじめよう！','___と___で___ができる！','ぜんぶでいくつ？','もっと___！ぜんぶで___。___！','ぜんぶバランスがとれたよ！'],
  la: ['Quaestio Summae','Tempus addendi!','___ et ___ faciunt ___!','Quot in summa?','___ plures! ___ in totum. ___!','Omnia aequantur!'],
  nl: ['Somzoektocht','Tijd om op te tellen!','___ en ___ maken een ___!','Hoeveel in totaal?','___ meer! ___ in totaal. ___!','Alles is in balans!'],
  pl: ['Misja Sumy','Czas dodawać!','___ i ___ dają ___!','Ile w sumie?','___ więcej! ___ łącznie. ___!','Wszystko jest zrównoważone!'],
  pt: ['Missão Soma','Hora de somar!','___ e ___ fazem um ___!','Quantos no total?','___ mais! ___ ao todo. ___!','Tudo está equilibrado!'],
  tr: ['Toplama Görevi','Toplama zamanı!','___ ve ___ bir ___ yapar!','Toplamda kaç tane?','___ daha! Toplamda ___. ___!','Her şey dengeli!'],
  zh: ['加法任务','开始加法了！','___和___等于___！','总共多少？','再多___！总共___。___！','一切都平衡了！'],
};

S['af2'] = {
  ar: ['جمع السحاب','اثنا عشر سحابة تمر.','___ فوق! ___ النتيجة. ___!','يظهر ضعف السحب!','___ و___ أكثر! ___!','المجموع يملأ السماء!'],
  da: ['Skysum','Tolv skyer driver forbi.','___ op! ___ scoren. ___!','Dobbelt så mange skyer dukker op!','___ og ___ mere! ___!','Totalen fylder himlen!'],
  de: ['Wolkensumme','Zwölf Wolken ziehen vorbei.','___ auf! ___ die Punktzahl. ___!','Doppelt so viele Wolken erscheinen!','___ und ___ mehr! ___!','Die Summe füllt den Himmel!'],
  es: ['Suma de Nubes','Doce nubes pasan flotando.','¡___ arriba! ___ la puntuación. ___!','¡Aparecen el doble de nubes!','¡___ y ___ más! ___!','¡El total llena el cielo!'],
  fr: ['Somme des Nuages','Douze nuages passent.','___ en haut ! ___ le score. ___ !','Le double de nuages apparaît !','___ et ___ de plus ! ___ !','Le total remplit le ciel !'],
  it: ['Somma delle Nuvole','Dodici nuvole passano.','___ su! ___ il punteggio. ___!','Appaiono il doppio delle nuvole!','___ e ___ di più! ___!','Il totale riempie il cielo!'],
  ja: ['くものたしざん','じゅうにのくもがとおりすぎるよ。','___あがる！___てん。___！','にばいのくもがあらわれる！','___ともっと___！___！','ごうけいがそらをうめるよ！'],
  la: ['Summa Nubium','Duodecim nubes praetereunt.','___ sursum! ___ puncta. ___!','Duplex nubes apparent!','___ et ___ plures! ___!','Summa caelum implet!'],
  nl: ['Wolkensom','Twaalf wolken drijven voorbij.','___ omhoog! ___ de score. ___!','Dubbel zoveel wolken verschijnen!','___ en ___ meer! ___!','Het totaal vult de lucht!'],
  pl: ['Suma Chmur','Dwanaście chmur przepływa.','___ w górę! ___ wynik. ___!','Podwójna ilość chmur się pojawia!','___ i ___ więcej! ___!','Suma wypełnia niebo!'],
  pt: ['Soma das Nuvens','Doze nuvens passam flutuando.','___ para cima! ___ a pontuação. ___!','Aparecem o dobro de nuvens!','___ e ___ mais! ___!','O total enche o céu!'],
  tr: ['Bulut Toplamı','On iki bulut geçiyor.','___ yukarı! ___ puanı. ___!','İki kat bulut beliriyor!','___ ve ___ daha! ___!','Toplam gökyüzünü dolduruyor!'],
  zh: ['云朵总和','十二朵云飘过。','___上去！___分。___！','双倍的云出现了！','___和再多___！___！','总数充满了天空！'],
};

S['af3'] = {
  ar: ['جمع النهر','عشرون حصاة في النهر!','ال___ كبير! ___ و___!','أحد عشر سمكة تسبح.','ال___ يتزايد! ___ و___!','حان وقت جمع كل شيء!'],
  da: ['Flod-addition','Tyve småsten i floden!','___ er stor! ___ og ___!','Elleve fisk svømmer forbi.','___ lægges sammen! ___ og ___!','Tid til at lægge det hele sammen!'],
  de: ['Fluss-Addition','Zwanzig Kiesel im Fluss!','Das ___ ist groß! ___ und ___!','Elf Fische schwimmen vorbei.','Das ___ addiert sich! ___ und ___!','Zeit alles zusammenzurechnen!'],
  es: ['Suma del Río','¡Veinte guijarros en el río!','¡El ___ es grande! ¡___ y ___!','Once peces nadan.','¡El ___ suma! ¡___ y ___!','¡Hora de sumar todo!'],
  fr: ['Addition de la Rivière','Vingt galets dans la rivière !','Le ___ est grand ! ___ et ___ !','Onze poissons nagent.','Le ___ s\'additionne ! ___ et ___ !','Il est temps de tout additionner !'],
  it: ['Addizione del Fiume','Venti ciottoli nel fiume!','Il ___ è grande! ___ e ___!','Undici pesci nuotano.','Il ___ si somma! ___ e ___!','È ora di sommare tutto!'],
  ja: ['かわのたしざん','かわにじゅうこのいしがあるよ！','___がおおきい！___と___！','じゅういっぴきのさかながおよぐよ。','___がふえる！___と___！','ぜんぶたしあわせよう！'],
  la: ['Additio Fluminis','Viginti calculi in flumine!','___ magnus est! ___ et ___!','Undecim pisces natant.','___ additur! ___ et ___!','Tempus omnia addendi!'],
  nl: ['Rivieroptelling','Twintig kiezelstenen in de rivier!','De ___ is groot! ___ en ___!','Elf vissen zwemmen voorbij.','De ___ telt op! ___ en ___!','Tijd om alles bij elkaar op te tellen!'],
  pl: ['Dodawanie Rzeczne','Dwadzieścia kamyków w rzece!','___ jest duży! ___ i ___!','Jedenaście ryb przepływa.','___ się sumuje! ___ i ___!','Czas dodać wszystko razem!'],
  pt: ['Adição do Rio','Vinte seixos no rio!','O ___ é grande! ___ e ___!','Onze peixes nadam.','O ___ soma! ___ e ___!','Hora de somar tudo!'],
  tr: ['Nehir Toplamı','Nehirde yirmi çakıl taşı!','___ büyük! ___ ve ___!','On bir balık yüzüyor.','___ toplanıyor! ___ ve ___!','Her şeyi toplama zamanı!'],
  zh: ['河流加法','河里有二十颗鹅卵石！','___很大！___和___！','十一条鱼游过来。','___在增加！___和___！','该把一切加起来了！'],
};

S['af4'] = {
  ar: ['جمع النجوم','كم عدد النجوم الليلة؟','___ تلمع! ___ أكثر و___!','عدها جميعاً!','___ فوق! ___ و___!','عشرون نجمة تملأ السماء!'],
  da: ['Stjerne-addition','Hvor mange stjerner i aften?','___ skinner! ___ mere og ___!','Tæl dem alle!','___ op! ___ og ___!','Tyve stjerner fylder himlen!'],
  de: ['Sternen-Addition','Wie viele Sterne heute Nacht?','___ leuchten! ___ mehr und ___!','Zähle sie alle!','___ auf! ___ und ___!','Zwanzig Sterne füllen den Himmel!'],
  es: ['Suma de Estrellas','¿Cuántas estrellas esta noche?','¡___ brillan! ¡___ más y ___!','¡Cuéntalas todas!','¡___ arriba! ¡___ y ___!','¡Veinte estrellas llenan el cielo!'],
  fr: ['Addition d\'Étoiles','Combien d\'étoiles ce soir ?','___ brillent ! ___ de plus et ___ !','Comptez-les toutes !','___ en haut ! ___ et ___ !','Vingt étoiles remplissent le ciel !'],
  it: ['Addizione di Stelle','Quante stelle stasera?','___ brillano! ___ di più e ___!','Contale tutte!','___ su! ___ e ___!','Venti stelle riempiono il cielo!'],
  ja: ['ほしのたしざん','こんやのほしはいくつ？','___がかがやく！もっと___と___！','ぜんぶかぞえよう！','___あがる！___と___！','にじゅうのほしがそらをうめるよ！'],
  la: ['Additio Stellarum','Quot stellae hac nocte?','___ lucent! ___ plures et ___!','Numera omnes!','___ sursum! ___ et ___!','Viginti stellae caelum implent!'],
  nl: ['Sterrenoptelling','Hoeveel sterren vanavond?','___ schijnen! ___ meer en ___!','Tel ze allemaal!','___ omhoog! ___ en ___!','Twintig sterren vullen de hemel!'],
  pl: ['Dodawanie Gwiazd','Ile gwiazd dziś w nocy?','___ świecą! ___ więcej i ___!','Policz je wszystkie!','___ w górę! ___ i ___!','Dwadzieścia gwiazd wypełnia niebo!'],
  pt: ['Adição de Estrelas','Quantas estrelas esta noite?','___ brilham! ___ mais e ___!','Conte todas!','___ para cima! ___ e ___!','Vinte estrelas enchem o céu!'],
  tr: ['Yıldız Toplamı','Bu gece kaç yıldız var?','___ parlıyor! ___ daha ve ___!','Hepsini say!','___ yukarı! ___ ve ___!','Yirmi yıldız gökyüzünü dolduruyor!'],
  zh: ['星星加法','今晚有多少星星？','___闪耀！再多___和___！','全部数一数！','___上去！___和___！','二十颗星星充满天空！'],
};

S['af5'] = {
  ar: ['جمع القمر','أحد عشر شعاعاً ينير المسار.','___ و___، ___!','كل شيء يساوي المجموع!','___ أشعة! ___ و___!','ضعف التوهج الليلة!'],
  da: ['Måne-addition','Elleve månestråler lyser stien.','___ og ___, ___!','Alt er lig totalen!','___ stråler! ___ og ___!','Dobbelt glød i aften!'],
  de: ['Mond-Addition','Elf Mondstrahlen erhellen den Weg.','___ und ___, ___!','Alles ergibt die Summe!','___ Strahlen! ___ und ___!','Doppeltes Leuchten heute Nacht!'],
  es: ['Suma de la Luna','Once rayos de luna iluminan el camino.','¡___ y ___, ___!','¡Todo es igual al total!','¡___ rayos! ¡___ y ___!','¡Doble brillo esta noche!'],
  fr: ['Addition de la Lune','Onze rayons de lune éclairent le chemin.','___ et ___, ___ !','Tout égale le total !','___ rayons ! ___ et ___ !','Double éclat ce soir !'],
  it: ['Addizione della Luna','Undici raggi di luna illuminano il sentiero.','___ e ___, ___!','Tutto è uguale al totale!','___ raggi! ___ e ___!','Doppio bagliore stasera!'],
  ja: ['つきのたしざん','じゅういちのつきのひかりがみちをてらすよ。','___と___、___！','ぜんぶごうけいとおなじだよ！','___のひかり！___と___！','こんやはにばいのかがやき！'],
  la: ['Additio Lunae','Undecim radii lunae viam illuminant.','___ et ___, ___!','Omnia summam aequant!','___ radii! ___ et ___!','Duplex splendor hac nocte!'],
  nl: ['Maanoptelling','Elf maanstralen verlichten het pad.','___ en ___, ___!','Alles is gelijk aan het totaal!','___ stralen! ___ en ___!','Dubbele gloed vanavond!'],
  pl: ['Dodawanie Księżyca','Jedenaście promieni księżyca oświetla ścieżkę.','___ i ___, ___!','Wszystko równa się sumie!','___ promieni! ___ i ___!','Podwójny blask dziś w nocy!'],
  pt: ['Adição da Lua','Onze raios de lua iluminam o caminho.','___ e ___, ___!','Tudo é igual ao total!','___ raios! ___ e ___!','Dobro do brilho esta noite!'],
  tr: ['Ay Toplamı','On bir ay ışığı yolu aydınlatıyor.','___ ve ___, ___!','Her şey toplama eşit!','___ ışın! ___ ve ___!','Bu gece çift parlaklık!'],
  zh: ['月亮加法','十一道月光照亮了小路。','___和___，___！','一切都等于总数！','___道光！___和___！','今晚双倍光芒！'],
};

// ═══ HARD: NUMBER SEQUENCES (ns1–ns5) ═══

S['ns1'] = {
  ar: ['عد التنين','في قديم الزمان، في أرض الأرقام...','___ فرسان! يظهر ___! ___!','عشرون قطعة ذهبية في عرين التنين.','___ جواهر! ___ لها! ___!','اللغز يفتح النهاية!'],
  da: ['Dragetælling','Der var engang i tallets land...','___ riddere! En ___ dukker op! ___!','Tyve guldmønter i dragens hule.','___ ædelstene! ___ dem! ___!','Puslespillet låser endelsen op!'],
  de: ['Drachenzählung','Es war einmal im Land der Zahlen...','___ Ritter! Ein ___ erscheint! ___!','Zwanzig Goldmünzen in der Drachenhöhle.','___ Edelsteine! ___ sie! ___!','Das Rätsel öffnet das Ende!'],
  es: ['Cuenta del Dragón','Había una vez, en la tierra de los números...','¡___ caballeros! ¡Aparece un ___! ___!','Veinte monedas de oro en la guarida del dragón.','¡___ gemas! ¡___ las! ___!','¡El rompecabezas desbloquea el final!'],
  fr: ['Compte du Dragon','Il était une fois, au pays des nombres...','___ chevaliers ! Un ___ apparaît ! ___ !','Vingt pièces d\'or dans l\'antre du dragon.','___ gemmes ! ___ les ! ___ !','Le puzzle déverrouille la fin !'],
  it: ['Conteggio del Drago','C\'era una volta, nella terra dei numeri...','___ cavalieri! Un ___ appare! ___!','Venti monete d\'oro nella tana del drago.','___ gemme! ___ le! ___!','Il puzzle sblocca il finale!'],
  ja: ['ドラゴンかぞえ','むかしむかし、すうじのくにで...','___にんのきし！___があらわれる！___！','ドラゴンのすあなにじゅうのきんか。','___のほうせき！___して！___！','パズルがエンディングをひらくよ！'],
  la: ['Numeratio Draconis','Olim in terra numerorum...','___ equites! ___ apparet! ___!','Viginti aurei in antro draconis.','___ gemmae! ___ eas! ___!','Aenigma finem aperit!'],
  nl: ['Drakentelling','Er was eens, in het land der getallen...','___ ridders! Een ___ verschijnt! ___!','Twintig gouden munten in het drakenhol.','___ edelstenen! ___ ze! ___!','De puzzel ontgrendelt het einde!'],
  pl: ['Liczenie Smoka','Dawno temu, w krainie liczb...','___ rycerzy! ___ się pojawia! ___!','Dwadzieścia złotych monet w smoczej jamie.','___ klejnotów! ___ je! ___!','Zagadka otwiera zakończenie!'],
  pt: ['Contagem do Dragão','Era uma vez, na terra dos números...','___ cavaleiros! Um ___ aparece! ___!','Vinte moedas de ouro na toca do dragão.','___ gemas! ___ elas! ___!','O quebra-cabeça desbloqueia o final!'],
  tr: ['Ejderha Sayımı','Bir zamanlar, sayılar diyarında...','___ şövalye! Bir ___ beliriyor! ___!','Ejderhanın ininde yirmi altın sikke.','___ mücevher! ___ onları! ___!','Bulmaca sonucu açıyor!'],
  zh: ['龙的计数','很久很久以前，在数字王国里...','___位骑士！一个___出现了！___！','龙穴里有二十枚金币。','___颗宝石！___它们！___！','谜题解锁了结局！'],
};

S['ns2'] = {
  ar: ['رياضيات الجنيات','اثنتا عشرة جنية ترقص في حلقة.','ال___ يتكشف! ___ و___!','كل شيء متوازن في أرض الجنيات.','___ أمنيات! ال___ يتوهج! ___!','كم بقي من الجنيات؟'],
  da: ['Fe-matematik','Tolv feer danser i en ring.','___ udfolder sig! ___ og ___!','Alt er i balance i feland.','___ ønsker! ___ gløder! ___!','Hvor mange feer er der tilbage?'],
  de: ['Feenmathe','Zwölf Feen tanzen im Kreis.','Das ___ entfaltet sich! ___ und ___!','Alles ist im Feenland ausgeglichen.','___ Wünsche! Das ___ leuchtet! ___!','Wie viele Feen sind noch übrig?'],
  es: ['Matemáticas de Hadas','Doce hadas bailan en un anillo.','¡El ___ se despliega! ¡___ y ___!','Todo está equilibrado en tierra de hadas.','¡___ deseos! ¡El ___ brilla! ___!','¿Cuántas hadas quedan?'],
  fr: ['Maths des Fées','Douze fées dansent en rond.','Le ___ se déploie ! ___ et ___ !','Tout est équilibré au pays des fées.','___ vœux ! Le ___ brille ! ___ !','Combien de fées restent ?'],
  it: ['Matematica delle Fate','Dodici fate danzano in cerchio.','Il ___ si svolge! ___ e ___!','Tutto è bilanciato nella terra delle fate.','___ desideri! Il ___ brilla! ___!','Quante fate rimangono?'],
  ja: ['ようせいさんすう','じゅうにのようせいがわになっておどるよ。','___がひろがる！___と___！','ようせいのくにではぜんぶバランスがとれているよ。','___のねがい！___がかがやく！___！','ようせいはなんにんのこっている？'],
  la: ['Mathematica Fatarum','Duodecim fatae in circulo saltant.','___ se aperit! ___ et ___!','Omnia in terra fatarum aequantur.','___ vota! ___ lucet! ___!','Quot fatae manent?'],
  nl: ['Feeënrekenen','Twaalf feeën dansen in een kring.','De ___ ontvouwt zich! ___ en ___!','Alles is in balans in feeënland.','___ wensen! De ___ gloeit! ___!','Hoeveel feeën zijn er nog over?'],
  pl: ['Matematyka Wróżek','Dwanaście wróżek tańczy w kółku.','___ się rozwija! ___ i ___!','Wszystko jest zrównoważone w krainie wróżek.','___ życzeń! ___ świeci! ___!','Ile wróżek zostało?'],
  pt: ['Matemática das Fadas','Doze fadas dançam em círculo.','O ___ se desenrola! ___ e ___!','Tudo está equilibrado na terra das fadas.','___ desejos! O ___ brilha! ___!','Quantas fadas restam?'],
  tr: ['Peri Matematiği','On iki peri halka içinde dans ediyor.','___ açılıyor! ___ ve ___!','Peri diyarında her şey dengeli.','___ dilek! ___ parlıyor! ___!','Kaç peri kaldı?'],
  zh: ['仙子数学','十二个仙子围成一圈跳舞。','___展开了！___和___！','在仙子国度里一切都平衡。','___个愿望！___闪耀！___！','还剩多少仙子？'],
};

S['ns3'] = {
  ar: ['جمع القراصنة','عد صناديق الكنز!','___ قطعة! ___ و___!','الكنز الإجمالي!','ال___ يلمع! ___ و___!','أحد عشر دبلوناً في الصندوق الأخير!'],
  da: ['Piratsum','Tæl skattekisterne!','___ mønter! ___ og ___!','Den samlede skat!','___ funkler! ___ og ___!','Elleve dukater i den sidste kiste!'],
  de: ['Piratensumme','Zähle die Schatztruhen!','___ Münzen! ___ und ___!','Der Gesamtschatz!','Das ___ funkelt! ___ und ___!','Elf Dublonen in der letzten Truhe!'],
  es: ['Suma Pirata','¡Cuenta los cofres del tesoro!','¡___ monedas! ¡___ y ___!','¡El tesoro total!','¡El ___ brilla! ¡___ y ___!','¡Once doblones en el último cofre!'],
  fr: ['Somme Pirate','Comptez les coffres au trésor !','___ pièces ! ___ et ___ !','Le trésor total !','Le ___ scintille ! ___ et ___ !','Onze doublons dans le dernier coffre !'],
  it: ['Somma dei Pirati','Conta i forzieri del tesoro!','___ monete! ___ e ___!','Il tesoro totale!','Il ___ brilla! ___ e ___!','Undici dobloni nell\'ultimo forziere!'],
  ja: ['かいぞくのたしざん','たからばこをかぞえよう！','___まいのコイン！___と___！','ぜんぶのたからもの！','___がきらきら！___と___！','さいごのはこにじゅういちまいのきんか！'],
  la: ['Summa Piratarum','Numera arcas thesauri!','___ nummi! ___ et ___!','Thesaurus totalis!','___ scintillat! ___ et ___!','Undecim aurei in ultima arca!'],
  nl: ['Piratensom','Tel de schatkisten!','___ munten! ___ en ___!','De totale schat!','De ___ schittert! ___ en ___!','Elf dukaten in de laatste kist!'],
  pl: ['Suma Piracka','Policz skrzynie skarbów!','___ monet! ___ i ___!','Całkowity skarb!','___ błyszczy! ___ i ___!','Jedenaście dublon w ostatniej skrzyni!'],
  pt: ['Soma Pirata','Conte os baús do tesouro!','___ moedas! ___ e ___!','O tesouro total!','O ___ brilha! ___ e ___!','Onze dobrões no último baú!'],
  tr: ['Korsan Toplamı','Hazine sandıklarını say!','___ sikke! ___ ve ___!','Toplam hazine!','___ parlıyor! ___ ve ___!','Son sandıkta on bir altın!'],
  zh: ['海盗总和','数数宝箱！','___枚硬币！___和___！','全部宝藏！','___闪闪发光！___和___！','最后一个箱子里有十一枚金币！'],
};

S['ns4'] = {
  ar: ['حكاية الروبوت','أحد عشر روبوتاً يعمل!','___ يصدر صوتاً! ___ و___!','دائرة اللغز تتصل!','ال___ يعد! ___ و___!','اثنا عشر روبوتاً يسيرون في تشكيل!'],
  da: ['Roboteventyr','Elleve robotter starter op!','___ bipper! ___ og ___!','Puslespilskredsløbet forbindes!','___ tæller! ___ og ___!','Tolv robotter marcherer i formation!'],
  de: ['Robotergeschichte','Elf Roboter starten!','___ piepen! ___ und ___!','Der Rätselkreis verbindet sich!','Der ___ zählt! ___ und ___!','Zwölf Roboter marschieren in Formation!'],
  es: ['Cuento del Robot','¡Once robots se activan!','¡___ suenan! ¡___ y ___!','¡El circuito del rompecabezas se conecta!','¡El ___ cuenta! ¡___ y ___!','¡Doce robots marchan en formación!'],
  fr: ['Conte du Robot','Onze robots s\'activent !','___ bippent ! ___ et ___ !','Le circuit du puzzle se connecte !','Le ___ compte ! ___ et ___ !','Douze robots marchent en formation !'],
  it: ['Racconto del Robot','Undici robot si attivano!','___ bippano! ___ e ___!','Il circuito del puzzle si collega!','Il ___ conta! ___ e ___!','Dodici robot marciano in formazione!'],
  ja: ['ロボットものがたり','じゅういちのロボットがうごきだす！','___がピッ！___と___！','パズルかいろがつながる！','___がかぞえる！___と___！','じゅうにのロボットがれつをくんですすむよ！'],
  la: ['Fabula Automati','Undecim automata accenduntur!','___ sonant! ___ et ___!','Circuitus aenigmatis connectitur!','___ numerat! ___ et ___!','Duodecim automata in ordine procedunt!'],
  nl: ['Robotverhaal','Elf robots worden geactiveerd!','___ piepen! ___ en ___!','Het puzzelcircuit verbindt!','De ___ telt! ___ en ___!','Twaalf robots marcheren in formatie!'],
  pl: ['Opowieść Robota','Jedenaście robotów się uruchamia!','___ bipią! ___ i ___!','Obwód zagadki się łączy!','___ liczy! ___ i ___!','Dwanaście robotów maszeruje w formacji!'],
  pt: ['Conto do Robô','Onze robôs ligam!','___ apitam! ___ e ___!','O circuito do quebra-cabeça se conecta!','O ___ conta! ___ e ___!','Doze robôs marcham em formação!'],
  tr: ['Robot Masalı','On bir robot çalışıyor!','___ bip sesi! ___ ve ___!','Bulmaca devresi bağlanıyor!','___ sayıyor! ___ ve ___!','On iki robot düzenli yürüyor!'],
  zh: ['机器人故事','十一个机器人启动了！','___在哔哔响！___和___！','谜题电路连接了！','___在计数！___和___！','十二个机器人列队前进！'],
};

S['ns5'] = {
  ar: ['عد الساحر','كم تعويذة في كتاب الساحر؟','ال___ يتوهج! ___ و___!','عشرون صفحة تنقلب بالسحر!','___ تعويذات! ___ و___!','القصة تنتهي بسعادة!'],
  da: ['Troldmandstælling','Hvor mange trylleformularer i troldmandens bog?','___ gløder! En ___ og ___!','Tyve sider vendes af magi!','___ formularer! ___ og ___!','Historien slutter lykkeligt!'],
  de: ['Zaubererzählung','Wie viele Zauber im Buch des Zauberers?','Das ___ leuchtet! Ein ___ und ___!','Zwanzig Seiten blättern magisch!','___ Zauber! ___ und ___!','Die Geschichte endet glücklich!'],
  es: ['Cuenta del Mago','¿Cuántos hechizos en el libro del mago?','¡El ___ brilla! ¡Un ___ y ___!','¡Veinte páginas se pasan por magia!','¡___ hechizos! ¡___ y ___!','¡La historia termina feliz!'],
  fr: ['Compte du Sorcier','Combien de sorts dans le livre du sorcier ?','Le ___ brille ! Un ___ et ___ !','Vingt pages tournent par magie !','___ sorts ! ___ et ___ !','L\'histoire se termine bien !'],
  it: ['Conteggio del Mago','Quanti incantesimi nel libro del mago?','Il ___ brilla! Un ___ e ___!','Venti pagine si girano per magia!','___ incantesimi! ___ e ___!','La storia finisce bene!'],
  ja: ['まほうつかいのかぞえ','まほうつかいのほんにいくつのまほうがある？','___がかがやく！___と___！','にじゅうページがまほうでめくれるよ！','___のまほう！___と___！','おはなしはしあわせにおわるよ！'],
  la: ['Numeratio Magi','Quot incantamenta in libro magi?','___ lucet! ___ et ___!','Viginti paginae magice vertuntur!','___ incantamenta! ___ et ___!','Fabula feliciter finit!'],
  nl: ['Tovenaarstelling','Hoeveel spreuken in het boek van de tovenaar?','De ___ gloeit! Een ___ en ___!','Twintig pagina\'s bladeren magisch!','___ spreuken! ___ en ___!','Het verhaal eindigt gelukkig!'],
  pl: ['Liczenie Czarodzieja','Ile zaklęć w księdze czarodzieja?','___ świeci! ___ i ___!','Dwadzieścia stron obraca się magicznie!','___ zaklęć! ___ i ___!','Historia kończy się szczęśliwie!'],
  pt: ['Contagem do Mago','Quantos feitiços no livro do mago?','O ___ brilha! Um ___ e ___!','Vinte páginas viram por magia!','___ feitiços! ___ e ___!','A história termina feliz!'],
  tr: ['Büyücü Sayımı','Büyücünün kitabında kaç büyü var?','___ parlıyor! Bir ___ ve ___!','Yirmi sayfa sihirle dönüyor!','___ büyü! ___ ve ___!','Hikaye mutlu bitiyor!'],
  zh: ['巫师计数','巫师的书里有多少咒语？','___在发光！一个___和___！','二十页魔法翻动！','___个咒语！___和___！','故事圆满结束！'],
};

// ═══ HARD: NUMBER PATTERNS (npa1–npa5) ═══

S['npa1'] = {
  ar: ['رمز الخطوط','يظهر نمط من الخطوط!','___ و___ يتبعان ال___!','عشرون شكلاً في صف.','___ و___ يصنعان ___!','النمط يتكرر بشكل مثالي!'],
  da: ['Stribe-kode','Et stribemønster dukker op!','___ og ___ følger ___!','Tyve figurer i en række.','___ og ___ skaber ___!','Mønsteret gentager sig perfekt!'],
  de: ['Streifencode','Ein Streifenmuster erscheint!','___ und ___ folgen dem ___!','Zwanzig Formen in einer Reihe.','___ und ___ ergeben ___!','Das Muster wiederholt sich perfekt!'],
  es: ['Código de Rayas','¡Aparece un patrón de rayas!','¡___ y ___ siguen el ___!','Veinte formas en fila.','¡___ y ___ crean ___!','¡El patrón se repite perfectamente!'],
  fr: ['Code Rayé','Un motif de rayures apparaît !','___ et ___ suivent le ___ !','Vingt formes en ligne.','___ et ___ créent ___ !','Le motif se répète parfaitement !'],
  it: ['Codice a Righe','Appare un motivo a righe!','___ e ___ seguono il ___!','Venti forme in fila.','___ e ___ creano ___!','Il motivo si ripete perfettamente!'],
  ja: ['しまもようコード','しまもようのパターンがあらわれるよ！','___と___が___にしたがう！','にじゅうのかたちがいちれつに。','___と___が___をつくる！','パターンがかんぺきにくりかえすよ！'],
  la: ['Codex Striarum','Exemplar striarum apparet!','___ et ___ sequuntur ___!','Viginti formae in ordine.','___ et ___ creant ___!','Exemplar perfecte repetitur!'],
  nl: ['Streepcode','Een streeppatroon verschijnt!','___ en ___ volgen de ___!','Twintig vormen op een rij.','___ en ___ maken ___!','Het patroon herhaalt zich perfect!'],
  pl: ['Kod Pasków','Pojawia się wzór z pasków!','___ i ___ podążają za ___!','Dwadzieścia kształtów w rzędzie.','___ i ___ tworzą ___!','Wzór powtarza się idealnie!'],
  pt: ['Código de Listras','Um padrão de listras aparece!','___ e ___ seguem o ___!','Vinte formas em fila.','___ e ___ criam ___!','O padrão se repete perfeitamente!'],
  tr: ['Şerit Kodu','Bir çizgi deseni beliriyor!','___ ve ___ takip ediyor ___!','Yirmi şekil sıralanıyor.','___ ve ___ oluşturuyor ___!','Desen mükemmel tekrarlanıyor!'],
  zh: ['条纹密码','一个条纹图案出现了！','___和___跟着___！','二十个形状排成一排。','___和___创造了___！','图案完美重复！'],
};

S['npa2'] = {
  ar: ['سلسلة الخرز','ضاعف الخرز على السلسلة!','ال___ يكبر. ___ و___!','ثلاثة أضعاف النمط!','إنه ___! ___ و___!','أحد عشر خرزة تكمل السلسلة.'],
  da: ['Perlekæde','Fordobl perlerne på kæden!','___ vokser. ___ og ___!','Tredobl mønsteret!','Det ___! ___ og ___!','Elleve perler fuldfører kæden.'],
  de: ['Perlenkette','Verdopple die Perlen an der Kette!','Die ___ wächst. ___ und ___!','Verdreifache das Muster!','Es ___! ___ und ___!','Elf Perlen vervollständigen die Kette.'],
  es: ['Cadena de Cuentas','¡Duplica las cuentas en la cadena!','¡El ___ crece. ___ y ___!','¡Triplica el patrón!','¡Eso ___! ¡___ y ___!','Once cuentas completan la cadena.'],
  fr: ['Chaîne de Perles','Double les perles sur la chaîne !','Le ___ grandit. ___ et ___ !','Triple le motif !','Ça ___ ! ___ et ___ !','Onze perles complètent la chaîne.'],
  it: ['Catena di Perline','Raddoppia le perline sulla catena!','Il ___ cresce. ___ e ___!','Triplica il motivo!','___! ___ e ___!','Undici perline completano la catena.'],
  ja: ['ビーズチェーン','チェーンのビーズをにばいにしよう！','___がおおきくなる。___と___！','パターンをさんばいに！','___だ！___と___！','じゅういちこのビーズでチェーンかんせい。'],
  la: ['Catena Globulorum','Duplica globulos in catena!','___ crescit. ___ et ___!','Triplica exemplar!','___ fit! ___ et ___!','Undecim globuli catenam complent.'],
  nl: ['Kralenketting','Verdubbel de kralen aan de ketting!','De ___ groeit. ___ en ___!','Verdrievoudig het patroon!','Het ___! ___ en ___!','Elf kralen maken de ketting af.'],
  pl: ['Łańcuszek Koralików','Podwój koraliki na łańcuszku!','___ rośnie. ___ i ___!','Potrój wzór!','To ___! ___ i ___!','Jedenaście koralików kończy łańcuszek.'],
  pt: ['Corrente de Contas','Dobre as contas na corrente!','O ___ cresce. ___ e ___!','Triplique o padrão!','Isso ___! ___ e ___!','Onze contas completam a corrente.'],
  tr: ['Boncuk Zinciri','Zincirdeki boncukları ikiye katla!','___ büyüyor. ___ ve ___!','Deseni üçe katla!','___ oluyor! ___ ve ___!','On bir boncuk zinciri tamamlıyor.'],
  zh: ['珠链','把链上的珠子加倍！','___在变大。___和___！','把图案变三倍！','___了！___和___！','十一颗珠子完成了链子。'],
};

S['npa3'] = {
  ar: ['أرضية البلاط','اثنا عشر بلاطة تشكل الصف الأول.','النمط ___! ___ و___!','كل شيء متوازن!','___ بلاطة! ___ و___!','سلسلة أنماط جميلة!'],
  da: ['Flisegulv','Tolv fliser danner den første række.','Mønsteret ___! ___ og ___!','Alt balancerer!','___ fliser! ___ og ___!','En smuk mønsterserie!'],
  de: ['Fliesenboden','Zwölf Fliesen bilden die erste Reihe.','Das Muster ___! ___ und ___!','Alles ist ausgeglichen!','___ Fliesen! ___ und ___!','Eine wunderschöne Musterserie!'],
  es: ['Piso de Azulejos','Doce azulejos forman la primera fila.','¡El patrón ___! ¡___ y ___!','¡Todo se equilibra!','¡___ azulejos! ¡___ y ___!','¡Una serie de patrones hermosos!'],
  fr: ['Sol Carrelé','Douze carreaux forment la première rangée.','Le motif ___ ! ___ et ___ !','Tout s\'équilibre !','___ carreaux ! ___ et ___ !','Une belle série de motifs !'],
  it: ['Pavimento di Piastrelle','Dodici piastrelle formano la prima fila.','Il motivo ___! ___ e ___!','Tutto si bilancia!','___ piastrelle! ___ e ___!','Una bella serie di motivi!'],
  ja: ['タイルのゆか','じゅうにまいのタイルがさいしょのれつをつくるよ。','パターンが___！___と___！','ぜんぶバランスがとれている！','___まいのタイル！___と___！','きれいなパターンシリーズ！'],
  la: ['Pavimentum Tegularum','Duodecim tegulae primum ordinem faciunt.','Exemplar ___! ___ et ___!','Omnia aequantur!','___ tegulae! ___ et ___!','Pulchra series exemplorum!'],
  nl: ['Tegelvloer','Twaalf tegels vormen de eerste rij.','Het patroon ___! ___ en ___!','Alles is in balans!','___ tegels! ___ en ___!','Een prachtige patroonserie!'],
  pl: ['Podłoga z Płytek','Dwanaście płytek tworzy pierwszy rząd.','Wzór ___! ___ i ___!','Wszystko się równoważy!','___ płytek! ___ i ___!','Piękna seria wzorów!'],
  pt: ['Piso de Azulejos','Doze azulejos formam a primeira fileira.','O padrão ___! ___ e ___!','Tudo se equilibra!','___ azulejos! ___ e ___!','Uma linda série de padrões!'],
  tr: ['Karo Zemin','On iki karo ilk sırayı oluşturuyor.','Desen ___! ___ ve ___!','Her şey dengeli!','___ karo! ___ ve ___!','Güzel bir desen serisi!'],
  zh: ['地砖','十二块瓷砖组成第一排。','图案___！___和___！','一切平衡！','___块瓷砖！___和___！','一个美丽的图案系列！'],
};

S['npa4'] = {
  ar: ['لولب النجوم','النمط يتكرر في لولب!','___ و___ يتبعان! ___!','ضاعف أذرع اللولب!','ال___ يكبر! ___ و___!','اثنا عشر نقطة تكمل النجمة.'],
  da: ['Stjernespiral','Mønsteret gentager sig i en spiral!','___ og ___ følger! ___!','Fordobl spiralarmene!','___ vokser! ___ og ___!','Tolv punkter fuldfører stjernen.'],
  de: ['Sternspirale','Das Muster wiederholt sich in einer Spirale!','___ und ___ folgen! ___!','Verdopple die Spiralarme!','Das ___ wächst! ___ und ___!','Zwölf Punkte vervollständigen den Stern.'],
  es: ['Espiral de Estrellas','¡El patrón se repite en espiral!','¡___ y ___ siguen! ___!','¡Duplica los brazos de la espiral!','¡El ___ crece! ¡___ y ___!','¡Doce puntos completan la estrella.'],
  fr: ['Spirale d\'Étoiles','Le motif se répète en spirale !','___ et ___ suivent ! ___ !','Double les bras de la spirale !','Le ___ grandit ! ___ et ___ !','Douze points complètent l\'étoile.'],
  it: ['Spirale di Stelle','Il motivo si ripete a spirale!','___ e ___ seguono! ___!','Raddoppia i bracci della spirale!','Il ___ cresce! ___ e ___!','Dodici punti completano la stella.'],
  ja: ['ほしのうずまき','パターンがうずまきでくりかえすよ！','___と___がつづく！___！','うずまきのうでをにばいにしよう！','___がおおきくなる！___と___！','じゅうにのてんがほしをかんせいさせるよ。'],
  la: ['Spiralis Stellarum','Exemplar in spirali repetitur!','___ et ___ sequuntur! ___!','Duplica brachia spiralis!','___ crescit! ___ et ___!','Duodecim puncta stellam complent.'],
  nl: ['Sterrenspiraal','Het patroon herhaalt zich in een spiraal!','___ en ___ volgen! ___!','Verdubbel de spiraal armen!','De ___ groeit! ___ en ___!','Twaalf punten maken de ster compleet.'],
  pl: ['Gwiezdna Spirala','Wzór powtarza się w spirali!','___ i ___ podążają! ___!','Podwój ramiona spirali!','___ rośnie! ___ i ___!','Dwanaście punktów kończy gwiazdę.'],
  pt: ['Espiral de Estrelas','O padrão se repete em espiral!','___ e ___ seguem! ___!','Dobre os braços da espiral!','O ___ cresce! ___ e ___!','Doze pontos completam a estrela.'],
  tr: ['Yıldız Spirali','Desen spiralde tekrarlanıyor!','___ ve ___ takip ediyor! ___!','Spiral kollarını ikiye katla!','___ büyüyor! ___ ve ___!','On iki nokta yıldızı tamamlıyor.'],
  zh: ['星星螺旋','图案在螺旋中重复！','___和___跟着！___！','把螺旋臂加倍！','___在变大！___和___！','十二个点完成了星星。'],
};

S['npa5'] = {
  ar: ['إيقاع الأمواج','أحد عشر موجة في إيقاع.','___ ال___! ___ و___!','النمط يتكرر!','___ و___ يصنعان ___!','عشرون موجة تتكسر على الشاطئ.'],
  da: ['Bølgerytme','Elleve bølger i en rytme.','___ ___! ___ og ___!','Mønsteret gentager sig!','___ og ___ skaber ___!','Tyve bølger bryder mod kysten.'],
  de: ['Wellenrhythmus','Elf Wellen im Rhythmus.','___ das ___! ___ und ___!','Das Muster wiederholt sich!','___ und ___ ergeben ___!','Zwanzig Wellen brechen am Ufer.'],
  es: ['Ritmo de Olas','Once olas en un ritmo.','¡___ el ___! ¡___ y ___!','¡El patrón se repite!','¡___ y ___ crean ___!','¡Veinte olas rompen en la orilla.'],
  fr: ['Rythme des Vagues','Onze vagues en rythme.','___ le ___ ! ___ et ___ !','Le motif se répète !','___ et ___ créent ___ !','Vingt vagues se brisent sur le rivage.'],
  it: ['Ritmo delle Onde','Undici onde in un ritmo.','___ il ___! ___ e ___!','Il motivo si ripete!','___ e ___ creano ___!','Venti onde si infrangono sulla riva.'],
  ja: ['なみのリズム','じゅういちのなみがリズムをきざむよ。','___が___！___と___！','パターンがくりかえす！','___と___が___をつくる！','にじゅうのなみがきしにうちよせるよ。'],
  la: ['Rhythmus Undarum','Undecim undae in rhythmo.','___ ___! ___ et ___!','Exemplar repetitur!','___ et ___ creant ___!','Viginti undae in litore frangunt.'],
  nl: ['Golfritme','Elf golven in een ritme.','___ de ___! ___ en ___!','Het patroon herhaalt zich!','___ en ___ maken ___!','Twintig golven breken op de kust.'],
  pl: ['Rytm Fal','Jedenaście fal w rytmie.','___ ___! ___ i ___!','Wzór się powtarza!','___ i ___ tworzą ___!','Dwadzieścia fal rozbija się o brzeg.'],
  pt: ['Ritmo das Ondas','Onze ondas em ritmo.','___ o ___! ___ e ___!','O padrão se repete!','___ e ___ criam ___!','Vinte ondas quebram na praia.'],
  tr: ['Dalga Ritmi','On bir dalga bir ritimde.','___ ___! ___ ve ___!','Desen tekrarlanıyor!','___ ve ___ oluşturuyor ___!','Yirmi dalga kıyıya vuruyor.'],
  zh: ['波浪节奏','十一个波浪有节奏地起伏。','___那个___！___和___！','图案重复！','___和___创造了___！','二十个波浪拍打海岸。'],
};

// ═══ HARD: SUBTRACTION FUN (sf1–sf5) ═══

S['sf1'] = {
  ar: ['مشاركة البسكويت','خذ بعض البسكويت — كم بقي؟','___ و___ أقل! ___!','عشرون بسكويتة للبدء.','___ تذهب! ___ تبقى! ___!','كل شيء متوازن في النهاية.'],
  da: ['Kagedeling','Tag nogle kager — hvor mange er der tilbage?','___ og ___ færre! ___!','Tyve kager at starte med.','___ går! ___ bliver! ___!','Alt balancerer til sidst.'],
  de: ['Kekse teilen','Nimm ein paar Kekse — wie viele bleiben?','___ und ___ weniger! ___!','Zwanzig Kekse am Anfang.','___ gehen! ___ bleiben! ___!','Alles gleicht sich am Ende aus.'],
  es: ['Compartir Galletas','Quita algunas galletas — ¿cuántas quedan?','¡___ y ___ menos! ___!','Veinte galletas para empezar.','¡___ se van! ¡___ se quedan! ___!','Todo se equilibra al final.'],
  fr: ['Partage de Biscuits','Enlève des biscuits — combien en reste-t-il ?','___ et ___ de moins ! ___ !','Vingt biscuits au départ.','___ partent ! ___ restent ! ___ !','Tout s\'équilibre à la fin.'],
  it: ['Condivisione di Biscotti','Togli dei biscotti — quanti ne restano?','___ e ___ di meno! ___!','Venti biscotti all\'inizio.','___ vanno! ___ restano! ___!','Tutto si bilancia alla fine.'],
  ja: ['クッキーわけ','クッキーをとったら、いくつのこる？','___と___すくない！___！','にじゅうまいのクッキーからスタート。','___がいく！___がのこる！___！','さいごにぜんぶバランスがとれるよ。'],
  la: ['Divisio Crustulorum','Quaedam crustula aufer — quot manent?','___ et ___ pauciores! ___!','Viginti crustula initio.','___ abeunt! ___ manent! ___!','Omnia in fine aequantur.'],
  nl: ['Koekjes delen','Neem wat koekjes weg — hoeveel zijn er over?','___ en ___ minder! ___!','Twintig koekjes om mee te beginnen.','___ gaan weg! ___ blijven! ___!','Alles is in balans aan het eind.'],
  pl: ['Dzielenie Ciastek','Zabierz kilka ciastek — ile zostało?','___ i ___ mniej! ___!','Dwadzieścia ciastek na start.','___ odchodzi! ___ zostaje! ___!','Wszystko się równoważy na końcu.'],
  pt: ['Compartilhar Biscoitos','Tire alguns biscoitos — quantos sobram?','___ e ___ a menos! ___!','Vinte biscoitos para começar.','___ vão! ___ ficam! ___!','Tudo se equilibra no final.'],
  tr: ['Kurabiye Paylaşımı','Bazı kurabiyeleri al — kaç tane kaldı?','___ ve ___ daha az! ___!','Başlangıçta yirmi kurabiye.','___ gidiyor! ___ kalıyor! ___!','Sonunda her şey dengeli.'],
  zh: ['分饼干','拿走一些饼干——还剩多少？','___和___少了！___！','从二十块饼干开始。','___走了！___留下！___！','最后一切都平衡了。'],
};

S['sf2'] = {
  ar: ['فرقعة البالونات','اثنا عشر بالوناً يطفو في السماء.','___ تذهب بعيداً! ___ بقيت! ___!','كم أقل الآن؟','___ و___ تبقى! ___!','الباقي يطفو بسعادة.'],
  da: ['Ballonprik','Tolv balloner svæver i luften.','___ væk! ___ tilbage! ___!','Hvor mange færre nu?','___ og ___ er tilbage! ___!','Resten svæver lykkeligt.'],
  de: ['Ballonplatzen','Zwölf Ballons schweben am Himmel.','___ weg! ___ übrig! ___!','Wie viele weniger jetzt?','___ und ___ bleiben! ___!','Der Rest schwebt fröhlich weiter.'],
  es: ['Globos que Explotan','Doce globos flotan en el cielo.','¡___ se van! ¡___ quedan! ___!','¿Cuántos menos ahora?','¡___ y ___ quedan! ___!','El resto sigue flotando feliz.'],
  fr: ['Ballons Éclatés','Douze ballons flottent dans le ciel.','___ s\'envolent ! ___ restent ! ___ !','Combien de moins maintenant ?','___ et ___ restent ! ___ !','Le reste flotte joyeusement.'],
  it: ['Palloncini Scoppiati','Dodici palloncini galleggiano nel cielo.','___ vanno via! ___ rimasti! ___!','Quanti di meno adesso?','___ e ___ rimangono! ___!','Il resto galleggia felicemente.'],
  ja: ['ふうせんパン','じゅうにのふうせんがそらにうかんでいるよ。','___がいなくなる！___のこった！___！','いまいくつすくない？','___と___がのこる！___！','のこりはたのしくうかんでいるよ。'],
  la: ['Folles Crepantes','Duodecim folles in caelo natant.','___ abeunt! ___ manent! ___!','Quot pauciores nunc?','___ et ___ manent! ___!','Ceteri feliciter natant.'],
  nl: ['Ballonnen knappen','Twaalf ballonnen zweven in de lucht.','___ weg! ___ over! ___!','Hoeveel minder nu?','___ en ___ blijven! ___!','De rest zweeft vrolijk verder.'],
  pl: ['Pękające Balony','Dwanaście balonów unosi się w niebie.','___ odlatuje! ___ zostaje! ___!','Ile mniej teraz?','___ i ___ zostają! ___!','Reszta radośnie unosi się dalej.'],
  pt: ['Balões Estourando','Doze balões flutuam no céu.','___ vão embora! ___ ficam! ___!','Quantos a menos agora?','___ e ___ permanecem! ___!','O resto continua flutuando feliz.'],
  tr: ['Balon Patlatma','Gökyüzünde on iki balon uçuyor.','___ gidiyor! ___ kaldı! ___!','Şimdi kaç tane az?','___ ve ___ kalıyor! ___!','Geri kalanlar mutluca uçuyor.'],
  zh: ['气球砰砰','十二个气球在天上飘。','___飞走了！___剩下！___！','现在少了多少？','___和___留下！___！','剩下的快乐地飘着。'],
};

S['sf3'] = {
  ar: ['أخذ التفاح','خذ بعضها! كم بقي؟','ال___ تبقى! ___ و___!','أحد عشر تفاحة على الشجرة.','___ تسقط! ___ و___!','بقي عدد قليل فقط.'],
  da: ['Æble-tag','Tag nogle! Hvor mange er der til overs?','___ bliver! ___ og ___!','Elleve æbler på træet.','___ falder! ___ og ___!','Kun et par færre er tilbage.'],
  de: ['Äpfel nehmen','Nimm welche! Wie viele bleiben?','Die ___ bleiben! ___ und ___!','Elf Äpfel am Baum.','___ fallen! ___ und ___!','Nur ein paar weniger übrig.'],
  es: ['Tomar Manzanas','¡Toma algunas! ¿Cuántas quedan?','¡Las ___ se quedan! ¡___ y ___!','Once manzanas en el árbol.','¡___ caen! ¡___ y ___!','Solo quedan unas pocas menos.'],
  fr: ['Prendre des Pommes','Prends-en ! Combien restent ?','Les ___ restent ! ___ et ___ !','Onze pommes dans l\'arbre.','___ tombent ! ___ et ___ !','Il n\'en reste que quelques-unes de moins.'],
  it: ['Prendere Mele','Prendine alcune! Quante ne restano?','Le ___ restano! ___ e ___!','Undici mele sull\'albero.','___ cadono! ___ e ___!','Ne restano solo poche di meno.'],
  ja: ['りんごをとろう','いくつかとろう！いくつのこる？','___がのこる！___と___！','きにじゅういちのりんご。','___がおちる！___と___！','すこしだけすくなくなったよ。'],
  la: ['Poma Capere','Cape quaedam! Quot manent?','___ manent! ___ et ___!','Undecim poma in arbore.','___ cadunt! ___ et ___!','Pauca tantum pauciora manent.'],
  nl: ['Appels pakken','Pak er wat! Hoeveel zijn er over?','De ___ blijven! ___ en ___!','Elf appels aan de boom.','___ vallen! ___ en ___!','Maar een paar minder over.'],
  pl: ['Branie Jabłek','Weź kilka! Ile zostało?','___ zostają! ___ i ___!','Jedenaście jabłek na drzewie.','___ spadają! ___ i ___!','Zostało tylko kilka mniej.'],
  pt: ['Pegar Maçãs','Pegue algumas! Quantas ficam?','As ___ ficam! ___ e ___!','Onze maçãs na árvore.','___ caem! ___ e ___!','Apenas algumas a menos sobraram.'],
  tr: ['Elma Toplama','Biraz al! Kaç tane kaldı?','___ kalıyor! ___ ve ___!','Ağaçta on bir elma.','___ düşüyor! ___ ve ___!','Sadece birkaç tane az kaldı.'],
  zh: ['拿苹果','拿走一些！还剩多少？','___留下！___和___！','树上有十一个苹果。','___掉下来了！___和___！','只少了几个。'],
};

S['sf4'] = {
  ar: ['سقوط النجوم','بعض النجوم تبقى بينما تسقط أخرى.','___ و___. بعضها ___!','خذ بعضها من السماء!','___ منها! ___ و___!','بقي عدد قليل.'],
  da: ['Stjernefald','Nogle stjerner forbliver mens andre falder.','___ og ___. Nogle ___!','Tag nogle væk fra himlen!','___ af dem! ___ og ___!','Et par er efterladt.'],
  de: ['Sternschnuppen','Manche Sterne bleiben, andere fallen.','___ und ___. Einige ___!','Nimm welche vom Himmel!','___ von ihnen! ___ und ___!','Ein paar bleiben übrig.'],
  es: ['Estrellas Fugaces','Algunas estrellas quedan mientras otras caen.','___ y ___. ¡Algunas ___!','¡Quita algunas del cielo!','¡___ de ellas! ¡___ y ___!','Quedan unas pocas.'],
  fr: ['Étoiles Filantes','Certaines étoiles restent tandis que d\'autres tombent.','___ et ___. Quelques ___ !','Enlève-en du ciel !','___ d\'entre elles ! ___ et ___ !','Il en reste quelques-unes.'],
  it: ['Stelle Cadenti','Alcune stelle restano mentre altre cadono.','___ e ___. Alcune ___!','Togliane dal cielo!','___ di esse! ___ e ___!','Ne restano poche.'],
  ja: ['ほしがおちる','ほしがのこるあいだにほかはおちるよ。','___と___。いくつかが___！','そらからいくつかとろう！','___こ！___と___！','すこしだけのこったよ。'],
  la: ['Stellae Cadentes','Aliae stellae manent dum aliae cadunt.','___ et ___. Quaedam ___!','Quasdam de caelo aufer!','___ earum! ___ et ___!','Paucae post relictae sunt.'],
  nl: ['Vallende sterren','Sommige sterren blijven terwijl andere vallen.','___ en ___. Sommige ___!','Haal er wat van de hemel!','___ ervan! ___ en ___!','Een paar zijn achtergebleven.'],
  pl: ['Spadające Gwiazdy','Niektóre gwiazdy zostają, a inne spadają.','___ i ___. Niektóre ___!','Zabierz kilka z nieba!','___ z nich! ___ i ___!','Kilka zostało.'],
  pt: ['Estrelas Cadentes','Algumas estrelas ficam enquanto outras caem.','___ e ___. Algumas ___!','Tire algumas do céu!','___ delas! ___ e ___!','Algumas ficaram para trás.'],
  tr: ['Yıldız Kayması','Bazı yıldızlar kalırken diğerleri düşer.','___ ve ___. Bazıları ___!','Gökyüzünden biraz al!','___ tanesi! ___ ve ___!','Birkaç tane geride kaldı.'],
  zh: ['星星坠落','一些星星留下，其他的落下。','___和___。一些___！','从天上拿走一些！','___个！___和___！','只剩下几个了。'],
};

S['sf5'] = {
  ar: ['حفر الرمل','أحد عشر حفنة في الدلو!','___ تذهب بعيداً! ___ و___!','كل شيء متوازن!','___ حفنات! ___ و___!','خذ الأخيرات بعيداً.'],
  da: ['Sandøse','Elleve øser i spanden!','___ væk! ___ og ___!','Alt balancerer!','___ øser! ___ og ___!','Tag de sidste væk.'],
  de: ['Sandschaufeln','Elf Schaufeln im Eimer!','___ weg! ___ und ___!','Alles ist ausgeglichen!','___ Schaufeln! ___ und ___!','Nimm die letzten weg.'],
  es: ['Pala de Arena','¡Once cucharadas en el balde!','¡___ se van! ¡___ y ___!','¡Todo está equilibrado!','¡___ cucharadas! ¡___ y ___!','Quita las últimas.'],
  fr: ['Pelletée de Sable','Onze pelletées dans le seau !','___ s\'en vont ! ___ et ___ !','Tout s\'équilibre !','___ pelletées ! ___ et ___ !','Enlève les dernières.'],
  it: ['Palata di Sabbia','Undici palate nel secchiello!','___ vanno via! ___ e ___!','Tutto si bilancia!','___ palate! ___ e ___!','Togli le ultime.'],
  ja: ['すなすくい','バケツにじゅういちすくい！','___がいなくなる！___と___！','ぜんぶバランスがとれている！','___すくい！___と___！','さいごのをとりのぞこう。'],
  la: ['Haustus Arenae','Undecim haustus in situla!','___ abeunt! ___ et ___!','Omnia aequantur!','___ haustus! ___ et ___!','Ultimos aufer.'],
  nl: ['Zandscheppen','Elf scheppen in de emmer!','___ weg! ___ en ___!','Alles is in balans!','___ scheppen! ___ en ___!','Haal de laatste weg.'],
  pl: ['Łopatka Piasku','Jedenaście łopatek w wiaderku!','___ odchodzą! ___ i ___!','Wszystko się równoważy!','___ łopatek! ___ i ___!','Zabierz ostatnie.'],
  pt: ['Pá de Areia','Onze pazadas no balde!','___ vão embora! ___ e ___!','Tudo está equilibrado!','___ pazadas! ___ e ___!','Tire as últimas.'],
  tr: ['Kum Küreği','Kovada on bir kürek!','___ gidiyor! ___ ve ___!','Her şey dengeli!','___ kürek! ___ ve ___!','Son olanları al.'],
  zh: ['铲沙子','桶里有十一铲！','___走了！___和___！','一切平衡！','___铲！___和___！','拿走最后几铲。'],
};


function esc(s) {
  return s.replace(/'/g, "\\'");
}

function applyTranslations() {
  const stories = Object.keys(S);
  if (stories.length === 0) {
    console.log('No translation data loaded yet.');
    return;
  }
  console.log('Translating ' + stories.length + ' numbers stories across ' + LOCALES.length + ' locales...\n');
  let totalReplacements = 0;

  for (const loc of LOCALES) {
    const filePath = path.join(LOCALES_DIR, loc, 'index.ts');
    if (!fs.existsSync(filePath)) { console.log('  SKIP ' + loc + ' (file not found)'); continue; }
    let lines = fs.readFileSync(filePath, 'utf8').split('\n');
    let locReplacements = 0;

    for (const storyKey of stories) {
      const vals = S[storyKey][loc];
      if (!vals) continue;

      // Find story block: e.g. "      cf1: {"
      const startRe = new RegExp('^(\\s+)' + storyKey + ':\\s*\\{');
      let startIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (startRe.test(lines[i])) { startIdx = i; break; }
      }
      if (startIdx === -1) continue;

      // Replace each field in the block
      for (let fi = 0; fi < FIELDS.length; fi++) {
        const fieldName = FIELDS[fi];
        const fieldRe = new RegExp("^(\\s+" + fieldName + ":\\s*').*('\\s*,?)$");
        for (let li = startIdx; li < Math.min(startIdx + 12, lines.length); li++) {
          const m = lines[li].match(fieldRe);
          if (m) {
            lines[li] = m[1] + esc(vals[fi]) + "'" + (m[2].startsWith("'") ? m[2].slice(1) : m[2]);
            locReplacements++;
            break;
          }
        }
      }
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    totalReplacements += locReplacements;
    console.log('  ' + LANG[loc] + ': ' + locReplacements + ' fields translated');
  }

  console.log('\nDone! ' + totalReplacements + ' total translations applied (' + stories.length + ' stories × ' + LOCALES.length + ' locales × 6 fields = ' + (stories.length * LOCALES.length * 6) + ' expected).');
}

applyTranslations();