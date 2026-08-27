import { offline } from './offlineStore';
import { convertMeasurement, equivalents as localEquivalents } from './conversionEngine';

const IS_NATIVE = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
const configuredBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
const BASE_URL = configuredBase.replace(/\/$/, '');
function getToken(){return localStorage.getItem('bd_token')}
async function request(path,{method='GET',body,isFormData=false}={}){const headers={};const token=getToken();if(token)headers.Authorization=`Bearer ${token}`;if(!isFormData)headers['Content-Type']='application/json';let response;try{response=await fetch(`${BASE_URL}${path}`,{method,headers,body:body?(isFormData?body:JSON.stringify(body)):undefined})}catch{const err=new Error('Could not reach the server. Check your connection and try again.');err.status=0;throw err}let data=null;try{data=await response.json()}catch{}if(!response.ok){const err=new Error(data?.message||`Request failed (${response.status})`);err.status=response.status;throw err}return data}
const choose=(localFn,webFn)=>(...args)=>IS_NATIVE?localFn(...args):webFn(...args);

export const login=choose(offline.login,(password)=>request('/auth/login',{method:'POST',body:{password}}));
export const getMe=choose(offline.getMe,()=>request('/auth/me'));
export const forgotPassword=choose(offline.forgotPassword,()=>request('/auth/forgot-password',{method:'POST'}));
export const getSettings=choose(offline.getSettings,()=>request('/settings'));
export const updateSettings=choose(offline.updateSettings,(body)=>request('/settings',{method:'PATCH',body}));
export const getRecipes=choose(offline.getRecipes,(params='')=>request(`/recipes${params}`));
export const getRecipe=choose(offline.getRecipe,(id)=>request(`/recipes/${id}`));
export const createRecipe=choose(offline.createRecipe,(body)=>request('/recipes',{method:'POST',body}));
export const updateRecipe=choose(offline.updateRecipe,(id,body)=>request(`/recipes/${id}`,{method:'PATCH',body}));
export const deleteRecipe=choose(offline.deleteRecipe,(id)=>request(`/recipes/${id}`,{method:'DELETE'}));
export const getRecipeNutrition=choose(offline.getRecipeNutrition,(id)=>request(`/recipes/${id}/nutrition`));
export const rematchIngredient=choose(offline.rematchIngredient,(id,name)=>request(`/recipes/${id}/nutrition/${encodeURIComponent(name)}/rematch`,{method:'PATCH'}));
export const getRecipeBakes=choose(offline.getRecipeBakes,(id)=>request(`/recipes/${id}/bakes`));
export const startSession=choose(offline.startSession,(recipeId)=>request('/sessions',{method:'POST',body:{recipeId}}));
export const getSession=choose(offline.getSession,(id)=>request(`/sessions/${id}`));
export const getContinuableSession=choose(offline.getContinuableSession,()=>request('/sessions/continue'));
export const updateSessionProgress=choose(offline.updateSessionProgress,(id,body)=>request(`/sessions/${id}/progress`,{method:'PATCH',body}));
export const attachStepPhoto=choose(offline.attachStepPhoto,(id,body)=>request(`/sessions/${id}/step-photo`,{method:'PATCH',body}));
export const completeSession=choose(offline.completeSession,(id,body)=>request(`/sessions/${id}/complete`,{method:'PATCH',body}));
export const abandonSession=choose(offline.abandonSession,(id)=>request(`/sessions/${id}/abandon`,{method:'PATCH'}));
export const getJournal=choose(offline.getJournal,()=>request('/journal'));
export const getJournalEntry=choose(offline.getJournalEntry,(id)=>request(`/journal/${id}`));
export const convert=choose(async(body)=>({success:true,result:convertMeasurement(body),equivalents:localEquivalents({value:body.value,fromUnit:body.fromUnit,ingredientName:body.ingredientName})}),(body)=>request('/conversions',{method:'POST',body}));
export const getGroceryItems=choose(offline.getGroceryItems,()=>request('/groceries'));
export const addGroceryItem=choose(offline.addGroceryItem,(body)=>request('/groceries',{method:'POST',body}));
export const addGroceriesFromRecipe=choose(offline.addGroceriesFromRecipe,(id)=>request(`/groceries/from-recipe/${id}`,{method:'POST'}));
export const updateGroceryItem=choose(offline.updateGroceryItem,(id,body)=>request(`/groceries/${id}`,{method:'PATCH',body}));
export const deleteGroceryItem=choose(offline.deleteGroceryItem,(id)=>request(`/groceries/${id}`,{method:'DELETE'}));
export const uploadMedia=choose(offline.uploadMedia,(file)=>{const form=new FormData();form.append('photo',file);return request('/media',{method:'POST',body:form,isFormData:true})});
export const setToken=(token)=>localStorage.setItem('bd_token',token);
export const clearToken=()=>localStorage.removeItem('bd_token');
export const hasToken=()=>IS_NATIVE||Boolean(getToken());
export const isOfflineEdition=()=>IS_NATIVE;
