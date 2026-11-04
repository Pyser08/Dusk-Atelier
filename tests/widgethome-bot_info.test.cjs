const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');const {CatalogService}=require('../src/widgethome/lib/service.cjs');
(async()=>{
const char={chaId:'a',name:'Example',desc:'Stored description',chats:[{id:'chat',name:'Chat'}]},reader={read:async()=>({characters:[char]})};let chats=0;
const api={getCharacterFromIndex:async()=>({...char,desc:'<p>Full description</p>',creator:'Author',creatorNotes:'Notes',firstMessage:'Hello',tags:['one','two']}),getChatFromIndex:async()=>{chats++;return {id:'chat',message:[{role:'char',data:'Recent message'}]}}};
const service=new CatalogService(api,{},undefined,reader),row={charId:'a'};
const result=await service.detail(row);assert(result.bot);assert.equal(result.fields.length,5);assert.equal(result.fields[0].text,'Full description');assert.equal(chats,0);
api.getCharacterFromIndex=async()=>{throw Error('unavailable')};const fallback=await service.detail(row);assert(fallback.warning);assert.equal(fallback.fields[0].text,'Stored description');
api.getCharacterFromIndex=async()=>({chaId:'different',desc:'Wrong bot'});assert.equal((await service.detail(row)).fields[0].text,'Stored description');
const recent=await service.detail({charId:'a',chatId:'chat'});assert(!recent.bot);assert.equal(recent.messages[0].text,'Recent message');assert.equal(chats,1);
const emptyService=new CatalogService({}, {},undefined,{read:async()=>({characters:[{chaId:'empty',name:'Empty'}]})});assert.equal((await emptyService.detail({charId:'empty'})).fields.length,0);
const src=fs.readFileSync(path.join(__dirname,'../src/widgethome/home.js'),'utf8');const nodes=new Map();function node(){return{children:[],open:false,append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items},showModal(){this.open=true}}}const $=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)};
const ctx=vm.createContext({$,document:{createElement:tag=>({...node(),tagName:tag})},state:{detailSerial:0,closed:false},text:(s,v)=>{$(s).textContent=v},empty:(n,v)=>{n.textContent=v;n.replaceChildren()},catalog:{detail:async()=>result}});
vm.runInContext(src.slice(src.indexOf('  async function detail(row)'),src.indexOf('  async function photoData(file)')),ctx);await ctx.detail({name:'Example'});assert($('.detail-dialog').open);assert.equal($('.messages').children.length,6);assert.equal($('.messages').children[0].children[0].textContent,'설명');assert.equal($('.messages').children[0].children[1].textContent,'Full description');
for(const i of [0,2,3]){assert.equal($('.messages').children[i].tagName,'details');assert.equal($('.messages').children[i].children[0].tagName,'summary');assert.equal($('.messages').children[i].open,false);}for(const i of [1,4])assert.equal($('.messages').children[i].tagName,'section');
console.log('PASS: bot hydration, identity mismatch, failure fallback, empty info, recent chat, detail modal rendering');
})().catch(e=>{console.error(e);process.exitCode=1});
