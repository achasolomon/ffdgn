import assert from "node:assert/strict";
import { blankPage, blankSection, safeContentLink, validPagePath, validateWebsitePage, websiteVideoSource } from "../lib/website-content";

const page=blankPage("/community","Community");
page.sections=[{...blankSection("text","intro"),title:"Our community",body:"Welcome to the Forum."}];
assert.equal(validateWebsitePage(page),null);
for(const path of ["/admin","/api/private","/portal/member","/site-preview/test","//evil.test","/a/../b","/a%2fb","/search","/Bad Path"]){assert.equal(validPagePath(path),false,path);}
for(const link of ["javascript:alert(1)","data:text/html,test","//evil.test","http://evil.test","/\\evil.test"]){assert.equal(safeContentLink(link),false,link);}
assert.equal(safeContentLink("/events?year=2026#archive"),true);
assert.equal(safeContentLink("https://example.org/programme"),true);
assert.equal(safeContentLink("mailto:info@example.org"),true);
assert.match(validateWebsitePage({...page,sections:[page.sections[0],page.sections[0]]})!,/unique/);
assert.match(validateWebsitePage({...page,image:"/assets/photo.jpg",alt:""})!,/description/);
assert.match(validateWebsitePage({...page,sections:[{...blankSection("table","table"),columns:["Name","Zone"],rows:[["One cell"]]}]})!,/Table/);
assert.match(validateWebsitePage({...page,sections:[{...blankSection("collection","records"),limit:Infinity}]})!,/limit/);
assert.match(validateWebsitePage({...page,sections:[{...blankSection("cards","cards"),items:[{title:"Bad link",body:"",image:"",alt:"",href:"javascript:test"}]}]})!,/links/);
assert.match(validateWebsitePage({...page,sections:[{...blankSection("text","one"),body:"文".repeat(16000)},{...blankSection("text","two"),body:"文".repeat(16000)}]})!,/too large/);
assert.equal(validateWebsitePage({...page,sections:[{...blankSection("table","members"),columns:["Name","Zone"],rows:[["Member","South-East"]]}]}),null);
console.log("Website document checks passed: reserved paths, unsafe links, images, duplicate IDs, table structure, limits and valid sections.");
assert.equal(websiteVideoSource("https://evil.example/embed/video"), null);
assert.equal(websiteVideoSource("https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ"), null);
assert.equal(websiteVideoSource("https://youtu.be/dQw4w9WgXcQ")?.src, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
assert.equal(websiteVideoSource("/uploads/forum.mp4")?.embedded, false);
assert.match(validateWebsitePage({...page, sections:[{...blankSection("video","video"),href:"https://evil.example/embed/video"}]})!, /video URL/);
