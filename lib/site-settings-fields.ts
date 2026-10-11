export const EXTRA_SITE_FIELDS = [
  {key:"site.short_name",label:"Short organisation name",value:"FFDGN"},
  {key:"site.logo",label:"Organisation logo",value:"/assets/brand/logo-whitebg.jpg"},
  {key:"site.logo_alt",label:"Logo description",value:"FFDGN seal"},
  {key:"site.skip_link",label:"Skip navigation accessibility label",value:"Skip to main content"},
  {key:"footer.description",label:"Footer introduction",value:"A non-partisan forum of former Deputy Governors committed to Nigeria’s unity, democratic governance and institutional excellence.",multiline:true},
  {key:"footer.motto",label:"Footer motto",value:"Experience | Collaboration | Better Governance"},
  {key:"footer.copyright",label:"Copyright notice",value:"© 2026 Forum of Former Deputy Governors of Nigeria. All rights reserved."},
  {key:"footer.cta_label",label:"Footer contact section label",value:"The Secretariat"},
  {key:"footer.cta_title",label:"Footer contact heading",value:"Questions about the Forum? Contact the Secretariat."},
  {key:"footer.cta_button",label:"Footer contact button",value:"Contact the Secretariat"},
  {key:"footer.cta_href",label:"Footer contact destination",value:"/contact"},
  {key:"footer.cta_image",label:"Footer contact background image",value:"/assets/hero/national.jpg"},
  {key:"hero.cta_primary_href",label:"Homepage primary button destination",value:"/about"},
  {key:"hero.cta_secondary_href",label:"Homepage secondary button destination",value:"/knowledge"},
] as const;
export const EXTRA_SITE_DEFAULTS:Record<string,string>=Object.fromEntries(EXTRA_SITE_FIELDS.map(field=>[field.key,field.value]));
