import { ValueObject } from '@domain/shared/value-object.js';

export enum MessageContentType {
  TEXT = 'TEXT',
  MEDIA = 'MEDIA',
  TEMPLATE = 'TEMPLATE',
}

interface TextContent {
  type: MessageContentType.TEXT;
  body: string;
}

interface MediaContent {
  type: MessageContentType.MEDIA;
  url: string;
  mimeType: string;
  caption?: string;
}

interface TemplateContent {
  type: MessageContentType.TEMPLATE;
  templateName: string;
  language: string;
  parameters: string[];
}

export type MessageContentData = TextContent | MediaContent | TemplateContent;

export class MessageContent extends ValueObject<MessageContentData> {
  private constructor(props: MessageContentData) {
    super(props);
  }

  static text(body: string): MessageContent {
    if (!body || body.trim().length === 0) {
      throw new Error('Text message body cannot be empty.');
    }
    return new MessageContent({ type: MessageContentType.TEXT, body });
  }

  static media(url: string, mimeType: string, caption?: string): MessageContent {
    if (!url || url.trim().length === 0) {
      throw new Error('Media URL cannot be empty.');
    }
    if (!mimeType || mimeType.trim().length === 0) {
      throw new Error('Media MIME type cannot be empty.');
    }
    return new MessageContent({ type: MessageContentType.MEDIA, url, mimeType, caption });
  }

  static template(templateName: string, language: string, parameters: string[]): MessageContent {
    if (!templateName || templateName.trim().length === 0) {
      throw new Error('Template name cannot be empty.');
    }
    return new MessageContent({
      type: MessageContentType.TEMPLATE,
      templateName,
      language,
      parameters,
    });
  }

  get type(): MessageContentType {
    return this.props.type;
  }

  get data(): MessageContentData {
    return this.props;
  }
}
