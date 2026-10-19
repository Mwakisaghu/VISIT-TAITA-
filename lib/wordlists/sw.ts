// Kiswahili words for the passphrase suggester: common, concrete, easy-to-type words (nature, animals, food, people, the home, travel, numbers, colours, everyday verbs and qualities).
// DRAFT: written for Visit Taita and NOT yet reviewed by a native speaker. A reviewer should read every word (spelling, and that none is rude or unsuitable) and may add or remove words.
// A wrong or odd word is not a security problem (the words are only a source of randomness), but it is a quality one. Plain lower-case letters only: no apostrophes or hyphens.
export const WORDS: readonly string[] = `
afya alfajiri amani anga arobaini asali asante askari asubuhi baadaye baba babu bahari baiskeli bakuli bamia bandari
barabara baraka baridi barua basi bata bega begi benki bibi binamu biriani birika blanketi bluu bonde breki buibui
bundi busara bustani bwawa chache chafu chai chaki chapati chemchemi chini choroko chui chumba chumvi chungu chungwa
chupa chura dada daftari daima dakika daktari damu daraja dengu dereva dhahabu dhoruba dirisha dua duka duma elfu embe
farasi fedha fenesi filimbi finyu fisi fundi fupi furaha gari gereza gitaa giza godoro goti gunia gurudumu habari
hadithi haki hamsini haraka hasira hekalu hekima heri heshima hodari hodi hofu hospitali hoteli huzuni injini ishirini
jahazi jambo jana jangwa jasiri jembe jepesi jibini jibu jicho jiji jiko jina jioni jirani jiwe jogoo joto jua juisi
juu kaa kabati kabichi kahawa kahawia kaka kakakuona kalamu kali kamba kamwe kanga kanisa kanzu kapu karanga karatasi
karibu karoti kasuku kata kati kavu kenge kesho kiangazi kiboko kichaka kichwa kidogo kidole kifaru kifua kijana
kijani kijiji kijiko kijivu kikapu kikombe kila kilele kilima kima kimbunga kimya kina kinanda kingo kinubi kinyonga
kiongozi kipepeo kipupwe kisima kisiwa kisu kitabu kitambaa kitanda kitenge kiti kitunguu kituo kiuno kivuko kivuli
kobe kocha kofia kompyuta kona kondoo kongoni konokono korongo koti kuaga kuamini kuamka kuandika kuanza kubeba kubwa
kucha kucheka kuchemsha kucheza kuchimba kuchoma kuchora kuchukua kufagia kufikiri kufuga kufunga kufungua kugusa
kuhesabu kuimba kuishi kuita kuja kujaribu kujaza kujenga kujibu kujifunza kukaa kukaanga kukanda kukata kukimbia kuku
kukumbuka kula kulala kuleta kulia kulipa kumaliza kumi kumwaga kunde kunguru kuni kununua kunusa kunywa kuogelea
kuoka kuomba kuona kuonja kuosha kupaka kupalilia kupanda kupata kupeleka kupenda kupepeta kupiga kupika kupima
kupokea kupoteza kupumzika kuruka kusafiri kusaga kusahau kusaidia kusalimu kusema kushika kushinda kushona kushoto
kushuka kushukuru kusikia kusimama kusoma kusubiri kusuka kusukuma kutafuta kutembea kutoa kutumaini kutupa kuukuu
kuuliza kuuza kuvua kuvuna kuvuta kuweka kuwinda kwaheri kwanza kware kwenda laini leo limau lugha maandazi macho
machweo mafuriko mafuta mahakama maharagwe mahindi majani maji majivu makaa maktaba malenge malkia mama mamba mandazi
maneno mara mashua masika masikio matoke matope matumaini matunda maua mavuno mawe mawingu mawio mayai mazao maziwa
mbali mbaya mbegu mbele mbichi mbili mbivu mboga mbu mbuni mbuzi mbwa mbweha mchana mchanga mchele mcheshi mchezaji
mchicha mchuuzi mchuzi mchwa mdomo meli mende meno methali meza mfalme mfereji mfugaji mfuko mfupa mgeni mgongo mguu
mia miguu mikono milima miti mito mji mjomba mjusi mkarimu mkate mkeka mkoa mkoba mkono mkulima mkuu mlango mlima
mlinzi moja moshi moto moyo mpaka mpenzi mpishi mpole mpya msanii mshumaa msichana msikiti msimu msitu mtaa mtama
mteremko mti mto mtoto mtu mtumbwi muhogo muuguzi mvua mvulana mvuvi mwaka mwalimu mwamba mwaminifu mwamuzi mwanamke
mwanamume mwandishi mwanga mwashi mwenyeji mwerevu mwewe mwezi mwimbaji mwisho mzazi mzee mzizi mzuri nahodha nanasi
nane nazi nchi ndani ndefu ndege ndezi ndimu ndizi ndogo ndoo ndoto nene neno ngamia ngano ngedere ngoma ngozi
nguchiro ngumu ngurumo nguruwe nguvu njano nje njia njiwa njugu nne nusu nyama nyani nyanya nyasi nyati nyekundu
nyembamba nyeupe nyeusi nyika nyingi nyoka nyota nyuki nyuma nyumba nywele nzi nzige nzuri ofisi paa paka pana panga
pango panya panzi papa papai pazia pembe penseli pera pesheni picha pikipiki pilau pili pilipili pipa pole polepole
pongezi popo posta pua pumzi punda pwani pweza radi rafiki ramani rangi redio robo rubani runinga saa saba sabini safi
sahani sakafu sala salamu samahani samaki sanamu sandali sanduku sasa sauti savana sekunde seremala shaba shamba
shangazi shati shimo shina shingo shoka shomoro shujaa shuka shukrani shule shwari siagi sikio siku sima simba simu
sindano sita sitini soda soko soksi stafeli stuli subira sufuria sukari sukuma sungura supu suruali swala swali taa
tafadhali tai taifa tambarare tamu tangawizi tango tano tarumbeta tatu tausi tawi tele tembo tende tetemeko themanini
tikiti tisa tisini treni tulivu tumbili tumbo tunda twiga ubao udongo ufuta ugali uhuru ujasiri uji ujumbe ukame
ukingo ukungu ukuta ukweli ulezi ulimi uma umande umeme upendo upepo usiku uso usukani uvumilivu uwanja uwele uzi
uzima viatu viazi vuli vumbi watoto watu wazi wiki wilaya wimbo wito zabibu zamani zambarau zito ziwa zulia
`.trim().split(/\s+/);
