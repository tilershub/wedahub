// Public API allowlist: callers cannot supply ownership, moderation flags or timestamps.
export function projectInput(body,userId){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid project');
 const text=(key,min,max)=>{const value=typeof body[key]==='string'?body[key].trim():'';if(value.length<min||value.length>max)throw new Error(`Invalid ${key}`);return value;};
 if(!Array.isArray(body.images)||body.images.length<1||body.images.length>5||body.images.some(v=>typeof v!=='string'||v.length>512))throw new Error('Add between 1 and 5 uploaded photos');
 return {user_id:userId,status:'active',project_type:text('project_type',2,160),city:text('city',1,100),district:text('district',0,100)||null,description:text('description',10,4000),customer_name:text('customer_name',2,100),whatsapp:text('whatsapp',9,20),budget_range:text('budget_range',0,100)||null,images:body.images};
}
