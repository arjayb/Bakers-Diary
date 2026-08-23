import exportedData from '../data/offline-export-v1.json';

const KEY = 'bakers_diary_offline_v2';
const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const clone = (x) => JSON.parse(JSON.stringify(x));

function seed() {
  const source = clone(exportedData);
  const mediaById = new Map();
  for (const recipe of source.recipes || []) {
    if (recipe.coverImage?.id) mediaById.set(recipe.coverImage.id, recipe.coverImage);
    for (const step of recipe.steps || []) if (step.referenceImage?.id) mediaById.set(step.referenceImage.id, step.referenceImage);
  }
  for (const session of source.sessions || []) {
    if (session.finalPhoto?.id) mediaById.set(session.finalPhoto.id, session.finalPhoto);
    for (const step of session.steps || []) for (const photo of step.photos || []) if (photo?.id) mediaById.set(photo.id, photo);
  }
  const sessions = (source.sessions || []).map(s => ({
    ...s,
    steps: (s.steps || []).map(ss => ({
      id: ss.id,
      sessionId: ss.sessionId,
      recipeStepId: ss.recipeStepId,
      completed: Boolean(ss.completed),
      notes: ss.notes ?? null,
      completedAt: ss.completedAt ?? null,
      photoIds: (ss.photos || []).map(p => p.id)
    }))
  }));
  return { user: source.user, settings: source.settings, recipes: source.recipes || [], sessions, groceries: source.groceries || [], media: [...mediaById.values()] };
}
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); } }
function save(db) { localStorage.setItem(KEY, JSON.stringify(db)); return db; }
function recipeWithMedia(db, recipe) { if (!recipe) return null; return { ...recipe, coverImage: db.media.find(m=>m.id===recipe.coverImageId) || recipe.coverImage || null }; }
function sessionFull(db, s) { if (!s) return null; const recipe = db.recipes.find(r=>r.id===s.recipeId); return { ...s, recipe: recipe ? { id:recipe.id,title:recipe.title,coverImage:recipeWithMedia(db,recipe).coverImage } : null, finalPhoto:db.media.find(m=>m.id===s.finalPhotoId)||s.finalPhoto||null, steps:(s.steps||[]).map(ss=>({ ...ss, recipeStep:recipe?.steps.find(rs=>rs.id===ss.recipeStepId)||null, photos:(ss.photoIds||[]).map(pid=>db.media.find(m=>m.id===pid)).filter(Boolean) })) }; }

export const offline = {
  login: async () => ({ token:'offline-device-v2', user:load().user }), getMe:async()=>({success:true,user:load().user}), forgotPassword:async()=>({success:true,message:'This offline edition uses trusted single-device access.'}),
  getSettings:async()=>({success:true,settings:clone(load().settings)}), updateSettings:async(body)=>{const db=load();db.settings={...db.settings,...body};save(db);return{success:true,settings:clone(db.settings)}},
  getRecipes:async(params='')=>{const db=load();const q=new URLSearchParams(params.replace(/^\?/,''));let recipes=db.recipes;if(q.get('favorite')==='true')recipes=recipes.filter(r=>r.favorite);if(q.get('status'))recipes=recipes.filter(r=>r.status===q.get('status'));recipes=[...recipes].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(r=>recipeWithMedia(db,r));return{success:true,count:recipes.length,recipes:clone(recipes)}},
  getRecipe:async(rid)=>{const db=load();const recipe=recipeWithMedia(db,db.recipes.find(r=>r.id===rid));if(!recipe)throw new Error('Recipe not found');return{success:true,recipe:clone(recipe)}},
  createRecipe:async(body)=>{const db=load();const rid=id('recipe');const recipe={...body,id:rid,favorite:false,status:body.status==='published'?'published':'draft',coverImageId:body.coverImageId||null,ingredients:(body.ingredients||[]).map((x,i)=>({...x,id:id('ingredient'),quantity:Number(x.quantity),order:x.order??i})),steps:(body.steps||[]).map((x,i)=>({...x,id:id('step'),order:x.order??i,timerSeconds:x.timerSeconds?Number(x.timerSeconds):null})),createdAt:now(),updatedAt:now()};db.recipes.push(recipe);save(db);return{success:true,recipe:clone(recipeWithMedia(db,recipe))}},
  updateRecipe:async(rid,body)=>{const db=load();const idx=db.recipes.findIndex(r=>r.id===rid);if(idx<0)throw new Error('Recipe not found');const historical=db.sessions.some(s=>s.recipeId===rid);if(historical&&body.steps&&body.steps.length!==db.recipes[idx].steps.length)throw new Error('This recipe has bake history. Existing Method steps may be edited, but steps cannot be added or removed.');const current=db.recipes[idx];const next={...current,...body,updatedAt:now()};if(body.ingredients)next.ingredients=body.ingredients.map((x,i)=>({...x,id:x.id||id('ingredient'),quantity:Number(x.quantity),order:x.order??i}));if(body.steps)next.steps=body.steps.map((x,i)=>({...current.steps[i],...x,id:current.steps[i]?.id||x.id||id('step'),order:x.order??i,timerSeconds:x.timerSeconds?Number(x.timerSeconds):null}));db.recipes[idx]=next;save(db);return{success:true,recipe:clone(recipeWithMedia(db,next))}},
  deleteRecipe:async(rid)=>{const db=load();const count=db.sessions.filter(s=>s.recipeId===rid).length;if(count)throw new Error(`This recipe has ${count} bake${count===1?'':'s'} in your Journal. Deleting it would delete that history too — not allowed.`);db.recipes=db.recipes.filter(r=>r.id!==rid);save(db);return{success:true,message:'Recipe deleted'}},
  startSession:async(recipeId)=>{const db=load();const recipe=db.recipes.find(r=>r.id===recipeId);if(!recipe)throw new Error('Recipe not found');if(!recipe.steps.length)throw new Error('This recipe has no steps yet — add a Method before starting a Bake.');const s={id:id('session'),recipeId,bakeNumber:Math.max(0,...db.sessions.filter(x=>x.recipeId===recipeId).map(x=>Number(x.bakeNumber)||0))+1,status:'in_progress',currentStepOrder:recipe.steps[0].order,finalPhotoId:null,finalNotes:null,rating:null,whatToChangeNextTime:null,startedAt:now(),completedAt:null,updatedAt:now(),steps:recipe.steps.map(rs=>({id:id('sessionstep'),recipeStepId:rs.id,completed:false,notes:null,completedAt:null,photoIds:[]}))};db.sessions.push(s);save(db);return{success:true,session:clone(sessionFull(db,s))}},
  getSession:async(sid)=>{const db=load();const s=sessionFull(db,db.sessions.find(x=>x.id===sid));if(!s)throw new Error('Bake session not found');return{success:true,session:clone(s)}},
  getContinuableSession:async()=>{const db=load();const s=[...db.sessions].filter(x=>x.status==='in_progress').sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];return{success:true,session:s?clone(sessionFull(db,s)):null}},
  updateSessionProgress:async(sid,body)=>{const db=load();const s=db.sessions.find(x=>x.id===sid);if(!s)throw new Error('Bake session not found');if(s.status!=='in_progress')throw new Error(`This bake is already ${s.status} — progress can't be changed.`);if(body.currentStepOrder!==undefined)s.currentStepOrder=Number(body.currentStepOrder);for(const u of body.stepUpdates||[]){const st=s.steps.find(x=>x.id===u.sessionStepId);if(!st)continue;if(u.completed!==undefined){st.completed=Boolean(u.completed);st.completedAt=u.completed?now():null}if(u.notes!==undefined)st.notes=u.notes}s.updatedAt=now();save(db);return{success:true,session:clone(sessionFull(db,s))}},
  attachStepPhoto:async(sid,body)=>{const db=load();const s=db.sessions.find(x=>x.id===sid);const st=s?.steps.find(x=>x.id===body.sessionStepId);if(!st)throw new Error('Bake session not found');st.photoIds=[...(st.photoIds||[]),body.mediaAssetId];s.updatedAt=now();save(db);return{success:true,session:clone(sessionFull(db,s))}},
  completeSession:async(sid,body)=>{const db=load();const s=db.sessions.find(x=>x.id===sid);if(!s)throw new Error('Bake session not found');s.status='completed';s.completedAt=now();s.updatedAt=now();s.finalPhotoId=body.finalPhotoId||null;s.finalNotes=body.finalNotes||null;s.rating=body.rating?Number(body.rating):null;s.whatToChangeNextTime=body.whatToChangeNextTime||null;save(db);return{success:true,session:clone(sessionFull(db,s))}},
  abandonSession:async(sid)=>{const db=load();const s=db.sessions.find(x=>x.id===sid);if(!s)throw new Error('Bake session not found');s.status='abandoned';s.updatedAt=now();save(db);return{success:true,session:clone(sessionFull(db,s))}},
  getJournal:async()=>{const db=load();const sessions=db.sessions.filter(s=>['completed','abandoned'].includes(s.status)).sort((a,b)=>String(b.completedAt||b.updatedAt).localeCompare(String(a.completedAt||a.updatedAt))).map(s=>sessionFull(db,s));return{success:true,count:sessions.length,sessions:clone(sessions)}},
  getJournalEntry:async(sid)=>offline.getSession(sid), getRecipeBakes:async(rid)=>{const db=load();const sessions=db.sessions.filter(s=>s.recipeId===rid).sort((a,b)=>b.bakeNumber-a.bakeNumber).map(s=>sessionFull(db,s));return{success:true,count:sessions.length,sessions:clone(sessions)}},
  getGroceryItems:async()=>{const items=[...load().groceries].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));return{success:true,count:items.length,items:clone(items)}}, addGroceryItem:async(body)=>{const db=load();const item={id:id('grocery'),label:body.label,quantity:body.quantity||null,checked:false,sourceRecipeId:body.sourceRecipeId||null,createdAt:now()};db.groceries.push(item);save(db);return{success:true,item:clone(item)}}, addGroceriesFromRecipe:async(rid)=>{const db=load();const r=db.recipes.find(x=>x.id===rid);if(!r)throw new Error('Recipe not found');const items=r.ingredients.map(i=>({id:id('grocery'),label:i.name,quantity:`${i.quantity} ${i.unit}`,checked:false,sourceRecipeId:rid,createdAt:now()}));db.groceries.push(...items);save(db);return{success:true,count:items.length,items:clone(items)}}, updateGroceryItem:async(gid,body)=>{const db=load();const item=db.groceries.find(x=>x.id===gid);if(!item)throw new Error('Grocery item not found');Object.assign(item,body);save(db);return{success:true,item:clone(item)}}, deleteGroceryItem:async(gid)=>{const db=load();db.groceries=db.groceries.filter(x=>x.id!==gid);save(db);return{success:true}},
  uploadMedia:async(file)=>{const db=load();const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});const media={id:id('media'),url:dataUrl,publicId:null,width:null,height:null,bytes:file.size,createdAt:now()};db.media.push(media);save(db);return{success:true,media:clone(media)}},
  getRecipeNutrition:async()=>({success:true,nutrition:null,message:'Nutrition lookup requires an internet connection in this offline edition.'}), rematchIngredient:async()=>{throw new Error('Nutrition rematching requires an internet connection.')},
  reset:()=>{localStorage.removeItem(KEY)}
};
