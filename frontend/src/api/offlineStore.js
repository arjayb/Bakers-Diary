import { ungzip } from 'pako';
import compressedSeed from '../data/offlineSeedCompressed.js';

const KEY = 'bakers_diary_offline_v2';
const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const clone = (x) => JSON.parse(JSON.stringify(x));

function exportedData() {
  const bytes = Uint8Array.from(atob(compressedSeed), c => c.charCodeAt(0));
  return JSON.parse(ungzip(bytes, { to: 'string' }));
}
function seed() {
  const source = clone(exportedData());
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
    steps: (s.steps || []).map(ss => ({ id:ss.id, sessionId:ss.sessionId, recipeStepId:ss.recipeStepId, completed:Boolean(ss.completed), notes:ss.notes ?? null, completedAt:ss.completedAt ?? null, photoIds:(ss.photos || []).map(p=>p.id) }))
  }));
  return { user:source.user, settings:source.settings, recipes:source.recipes || [], sessions, groceries:source.groceries || [], media:[...mediaById.values()] };
}
function load(){try{return JSON.parse(localStorage.getItem(KEY))||seed()}catch{return seed()}}
function save(db){localStorage.setItem(KEY,JSON.stringify(db));return db}
function recipeWithMedia(db,recipe){if(!recipe)return null;return{...recipe,coverImage:db.media.find(m=>m.id===recipe.coverImageId)||recipe.coverImage||null}}
function sessionFull(db,s){if(!s)return null;const recipe=db.recipes.find(r=>r.id===s.recipeId);return{...s,recipe:recipe?{id:recipe.id,title:recipe.title,coverImage:recipeWithMedia(db,recipe).coverImage}:null,finalPhoto:db.media.find(m=>m.id===s.finalPhotoId)||s.finalPhoto||null,steps:(s.steps||[]).map(ss=>({...ss,recipeStep:recipe?.steps.find(rs=>rs.id===ss.recipeStepId)||null,photos:(ss.photoIds||[]).map(pid=>db.media.find(m=>m.id===pid)).filter(Boolean)}))}}

export const offline={
login:async()=>({token:'offline-device-v2',user:load().user}),getMe:async()=>({success:true,user:load().user}),forgotPassword:async()=>({success:true,message:'This offline edition uses trusted single-device access.'}),
getSettings:async()=>({success:true,settings:clone(load().settings)}),updateSettings:async(body)=>{const db=load();db.settings={...db.settings,...body};save(db);return{success:true,settings:clone(db.settings)}},
getRecipes:async()=>({success:true,recipes:load().recipes.map(r=>recipeWithMedia(load(),r))}),getRecipe:async(rid)=>({success:true,recipe:recipeWithMedia(load(),load().recipes.find(r=>r.id===rid))}),
createRecipe:async(body)=>{const db=load(),t=now(),rid=id('recipe');const recipe={id:rid,userId:db.user.id,title:body.title||'Untitled Recipe',description:body.description||'',category:body.category||'',yield:body.yield||'',servings:Number(body.servings)||null,prepTimeMin:Number(body.prepTimeMin)||null,cookTimeMin:Number(body.cookTimeMin)||null,favorite:Boolean(body.favorite),status:'published',coverImageId:body.coverImageId||null,createdAt:t,updatedAt:t,ingredients:(body.ingredients||[]).map((x,i)=>({...x,id:id('ingredient'),recipeId:rid,order:i})),steps:(body.steps||[]).map((x,i)=>({...x,id:id('step'),recipeId:rid,order:i+1}))};db.recipes.unshift(recipe);save(db);return{success:true,recipe:recipeWithMedia(db,recipe)}},
updateRecipe:async(rid,body)=>{const db=load(),i=db.recipes.findIndex(r=>r.id===rid);if(i<0)throw new Error('Recipe not found');const old=db.recipes[i];db.recipes[i]={...old,...body,id:rid,userId:old.userId,updatedAt:now(),ingredients:body.ingredients?body.ingredients.map((x,j)=>({...x,id:x.id||id('ingredient'),recipeId:rid,order:j})):old.ingredients,steps:body.steps?body.steps.map((x,j)=>({...x,id:x.id||id('step'),recipeId:rid,order:j+1})):old.steps};save(db);return{success:true,recipe:recipeWithMedia(db,db.recipes[i])}},
deleteRecipe:async rid=>{const db=load();if(db.sessions.some(s=>s.recipeId===rid))throw new Error('This recipe has bake history and cannot be deleted.');db.recipes=db.recipes.filter(r=>r.id!==rid);save(db);return{success:true}},
getRecipeNutrition:async()=>({success:true,nutrition:null,message:'Nutrition lookup needs an internet connection.'}),rematchIngredient:async()=>({success:false,message:'Nutrition rematching needs an internet connection.'}),
getRecipeBakes:async rid=>({success:true,bakes:load().sessions.filter(s=>s.recipeId===rid&&s.status==='completed').map(s=>sessionFull(load(),s))}),
startSession:async rid=>{const db=load(),recipe=db.recipes.find(r=>r.id===rid);if(!recipe)throw new Error('Recipe not found');const prior=db.sessions.filter(s=>s.recipeId===rid);const s={id:id('session'),userId:db.user.id,recipeId:rid,bakeNumber:Math.max(0,...prior.map(x=>Number(x.bakeNumber)||0))+1,status:'in_progress',currentStepOrder:1,finalPhotoId:null,finalNotes:null,rating:null,whatToChangeNextTime:null,startedAt:now(),completedAt:null,updatedAt:now(),steps:recipe.steps.map(rs=>({id:id('sessionstep'),sessionId:null,recipeStepId:rs.id,completed:false,notes:null,completedAt:null,photoIds:[]}))};s.steps.forEach(x=>x.sessionId=s.id);db.sessions.unshift(s);save(db);return{success:true,session:sessionFull(db,s)}},
getSession:async sid=>({success:true,session:sessionFull(load(),load().sessions.find(s=>s.id===sid))}),getContinuableSession:async()=>{const db=load(),s=db.sessions.find(x=>x.status==='in_progress');return{success:true,session:sessionFull(db,s)}},
updateSessionProgress:async(sid,body)=>{const db=load(),s=db.sessions.find(x=>x.id===sid);if(!s)throw new Error('Session not found');if(body.currentStepOrder!=null)s.currentStepOrder=body.currentStepOrder;if(body.stepId){const st=s.steps.find(x=>x.recipeStepId===body.stepId||x.id===body.stepId);if(st){if(body.completed!=null)st.completed=body.completed;if(body.notes!==undefined)st.notes=body.notes;st.completedAt=st.completed?now():null}}s.updatedAt=now();save(db);return{success:true,session:sessionFull(db,s)}},
attachStepPhoto:async(sid,body)=>{const db=load(),s=db.sessions.find(x=>x.id===sid),st=s?.steps.find(x=>x.recipeStepId===body.stepId||x.id===body.stepId);if(!st)throw new Error('Step not found');if(body.mediaId&&!st.photoIds.includes(body.mediaId))st.photoIds.push(body.mediaId);save(db);return{success:true,session:sessionFull(db,s)}},
completeSession:async(sid,body={})=>{const db=load(),s=db.sessions.find(x=>x.id===sid);if(!s)throw new Error('Session not found');Object.assign(s,{status:'completed',completedAt:now(),updatedAt:now(),finalPhotoId:body.finalPhotoId||null,finalNotes:body.finalNotes||'',rating:body.rating||null,whatToChangeNextTime:body.whatToChangeNextTime||''});save(db);return{success:true,session:sessionFull(db,s)}},abandonSession:async sid=>{const db=load(),s=db.sessions.find(x=>x.id===sid);if(s){s.status='abandoned';s.updatedAt=now();save(db)}return{success:true}},
getJournal:async()=>{const db=load();return{success:true,entries:db.sessions.filter(s=>s.status==='completed').map(s=>sessionFull(db,s))}},getJournalEntry:async sid=>({success:true,entry:sessionFull(load(),load().sessions.find(s=>s.id===sid))}),
getGroceryItems:async()=>({success:true,items:clone(load().groceries)}),addGroceryItem:async body=>{const db=load(),item={id:id('grocery'),userId:db.user.id,name:body.name,quantity:body.quantity||'',checked:false,sourceRecipeId:body.sourceRecipeId||null,createdAt:now()};db.groceries.push(item);save(db);return{success:true,item}},addGroceriesFromRecipe:async rid=>{const db=load(),r=db.recipes.find(x=>x.id===rid);for(const x of r?.ingredients||[])db.groceries.push({id:id('grocery'),userId:db.user.id,name:x.name,quantity:`${x.quantity??''} ${x.unit??''}`.trim(),checked:false,sourceRecipeId:rid,createdAt:now()});save(db);return{success:true,items:clone(db.groceries)}},updateGroceryItem:async(gid,body)=>{const db=load(),i=db.groceries.findIndex(x=>x.id===gid);if(i>=0)db.groceries[i]={...db.groceries[i],...body};save(db);return{success:true,item:clone(db.groceries[i])}},deleteGroceryItem:async gid=>{const db=load();db.groceries=db.groceries.filter(x=>x.id!==gid);save(db);return{success:true}},
uploadMedia:async file=>{const db=load();const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});const media={id:id('media'),url,publicId:null,width:null,height:null,bytes:file.size,createdAt:now()};db.media.push(media);save(db);return{success:true,media}}
};
