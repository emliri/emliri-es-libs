import {xml2js} from 'xml-js'

export type XMLElement = {
  attributes: any;
  text: string;
  name: string;
  type: string;
  elements: XMLElement[]
}

export type XMLRootObject = {
  elements: XMLElement[]
}

export function parseXmlData(data: string): XMLRootObject {
  // TODO: xml-js has own @types now!!
  return <XMLRootObject> xml2js(data, {
    compact: false
  })
}
