// types.ts
export interface PedagogyLink { _id?:string; name:string; url:string; uploadedAt?:string }
export interface PedagogyFile {
  _id?:string; fileName:string; fileType:string; size:string; uploadedAt?:string;
  fileUrl: string|{base?:string;[k:string]:string|undefined};
  isReference?:boolean; isVideo?:boolean; isArchive?:boolean;
  availableResolutions?:string[];
  fileSettings?:{showToStudents:boolean;allowDownload:boolean;lastModified?:string};
  tags?:Array<{tagName:string;tagColor:string}>;
}
export interface PedagogyFolder { _id?:string; name:string; files:PedagogyFile[]; subfolders?:PedagogyFolder[]; uploadedAt?:string; tags?:Array<{tagName:string;tagColor:string}> }
export interface PedagogyPage { _id:string; title:string; combinedCode:string; pageCount?:number; createdAt?:string; isMultiPage?:boolean }
export interface PedagogyItem { description?:string; files?:PedagogyFile[]; folders?:PedagogyFolder[]; links?:PedagogyLink[]; pages?:PedagogyPage[]; _id?:string }
export interface Pedagogy { I_Do?:Record<string,PedagogyItem>|string[]; We_Do?:Record<string,PedagogyItem>|string[]; You_Do?:Record<string,PedagogyItem>|string[]; _id?:string }
export interface SubTopic { _id:string; title:string; description:string; duration?:string; level?:string; subTopics?:SubTopic[]; pedagogy?:Pedagogy }
export interface Topic    { _id:string; title:string; description:string; duration?:string; level?:string; subTopics?:SubTopic[]; pedagogy?:Pedagogy }
export interface SubModule{ _id:string; title:string; description:string; topics?:Topic[]; pedagogy?:Pedagogy }
export interface Module   { _id:string; title:string; description:string; subModules?:SubModule[]; topics?:Topic[]; pedagogy?:Pedagogy }

export interface CourseData {
  _id:string; courseName:string; courseDescription:string; courseHierarchy?:string[];
  I_Do?:string[]; We_Do?:string[]; You_Do?:string[];
  modules?:Module[];
  singleParticipants?: Array<{
    user?: {
      _id?: string
      courses?: Array<{ courseId: string; answers?: Record<string, any> }>
      [key: string]: any
    }
    [key: string]: any
  }>
}

export type ResourceType = "video"|"pdf"|"ppt"|"zip"|"link"|"reference"|"page"
export interface Resource {
  id:string; title:string; type:ResourceType;
  fileUrl?:string|{base?:string;[k:string]:string|undefined}; 
  mcqQuestions?:any[];
  isReference?:boolean; externalUrl?:string; fileSize?:string; uploadedAt?:string;
  fileName?:string; isFolder?:boolean; folderContents?:Resource[]; folderType?:"similar"|"mixed";
  fileSettings?:{showToStudents:boolean;allowDownload:boolean};
  isVideo?:boolean; isArchive?:boolean; 
  availableResolutions?: string[];
  fileUrlMap?: Record<string, string>;
  _combinedCode?:string; _pageCount?:number; originalFolder?:string; folderName?:string;
  tags?: Array<{tagName:string; tagColor:string}>
}
export interface PedagogySubItem { key:string; name:string; description:string; files:PedagogyFile[]; folders?:PedagogyFolder[]; links?:PedagogyLink[] }
export type LearningElementType = "i-do"|"we-do"|"you-do"
export interface LearningElement { id:string; title:string; type:LearningElementType; icon:React.ComponentType<any>; color:string; subItems:PedagogySubItem[] }
export type SelectedItemType = "module"|"submodule"|"topic"|"subtopic"
export interface SelectedItem { id:string; title:string; type:SelectedItemType; hierarchy:string[]; pedagogy?:Pedagogy }
export type SortField = "name"|"size"|"date"
export interface SortConfig { field:SortField; direction:"asc"|"desc" }
export interface RoleSwitchState { isDummyStudent:boolean; originalRole?:string; originalRenameRole?:string; switchTimestamp?:number }