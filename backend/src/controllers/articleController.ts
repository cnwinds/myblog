import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ArticleModel } from '../models/Article';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

// 未登录用户可以查看文章（只读，只返回已发布的）
export function getArticles(req: Request, res: Response) {
  try {
    const category = req.query.category as string | undefined;
    const articles = ArticleModel.findAll(category, false); // 不包含未发布的
    res.json(articles);
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 未登录用户可以查看文章详情（只读，只返回已发布的）
export function getArticle(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const article = ArticleModel.findById(id, false); // 不包含未发布的

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 登录用户可以创建文章
export function createArticle(req: AuthRequest, res: Response) {
  try {
    const { title, content, imagePlans, category, published, sortOrder } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // published: true = 1 (已发布), false = 0 (草稿)
    const publishedValue = published === false ? 0 : (published === true ? 1 : 1); // 默认为已发布

    const article = ArticleModel.create({
      title,
      content,
      authorId: req.userId,
      imagePlans: imagePlans ? JSON.stringify(imagePlans) : undefined,
      category: category || 'blog',
      published: publishedValue,
      sortOrder: sortOrder !== undefined ? sortOrder : undefined,
    });

    res.status(201).json(article);
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 登录用户可以更新文章
export function updateArticle(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { title, content, imagePlans, category, published, sortOrder } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (imagePlans !== undefined) {
      updateData.imagePlans = imagePlans ? JSON.stringify(imagePlans) : null;
    }
    if (category !== undefined) updateData.category = category;
    if (published !== undefined) {
      // published: true = 1 (已发布), false = 0 (草稿)
      updateData.published = published === false ? 0 : (published === true ? 1 : 1);
      console.log(`[updateArticle] Setting published to ${updateData.published} for article ${id}, received:`, published);
    }
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    // 更新时允许查询未发布的文章
    const article = ArticleModel.findById(id, true);
    if (!article || article.authorId !== req.userId) {
      return res.status(404).json({ error: 'Article not found or unauthorized' });
    }

    console.log(`[updateArticle] Before update - article ${id} published status:`, article.published);
    console.log(`[updateArticle] Update data:`, updateData);
    
    const updatedArticle = ArticleModel.update(id, updateData, req.userId);
    
    console.log(`[updateArticle] After update - article ${id} published status:`, updatedArticle?.published);

    if (!updatedArticle) {
      return res.status(404).json({ error: 'Article not found or unauthorized' });
    }

    res.json(updatedArticle);
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 登录用户可以删除文章
export function deleteArticle(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const success = ArticleModel.delete(id, req.userId);

    if (!success) {
      return res.status(404).json({ error: 'Article not found or unauthorized' });
    }

    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 获取所有未发布的文章（仅登录用户可见自己的草稿）
export function getUnpublishedArticles(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const articles = ArticleModel.findUnpublished(req.userId);
    res.json(articles);
  } catch (error) {
    console.error('Get unpublished articles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 从URL获取文章内容并转换为Markdown
export async function fetchArticleFromUrl(req: AuthRequest, res: Response) {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    // 验证URL格式
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // 获取网页内容
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch URL: ${response.statusText}` 
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 提取标题 - 尝试多种选择器
    let title = '';
    const titleSelectors = [
      'h1',
      'title',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      '.article-title',
      '.post-title',
      '[class*="title"]',
    ];

    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length) {
        if (selector.startsWith('meta')) {
          title = element.attr('content') || '';
        } else {
          title = element.text().trim();
        }
        if (title) break;
      }
    }

    // 如果还没找到标题，使用document.title
    if (!title) {
      title = $('title').text().trim();
    }

    // 提取文章内容 - 尝试多种选择器
    let content = '';
    const contentSelectors = [
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '[role="main"]',
      '.main-content',
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        content = element.html() || '';
        if (content) break;
      }
    }

    // 如果还没找到内容，尝试body
    if (!content) {
      // 移除script、style等不需要的标签
      $('script, style, nav, header, footer, aside, .sidebar, .menu').remove();
      content = $('body').html() || '';
    }

    if (!content) {
      return res.status(400).json({ error: 'Could not extract article content from the URL' });
    }

    // 创建一个新的cheerio实例来处理内容
    const $content = cheerio.load(content);
    
    // 处理图片 - 将相对路径转换为绝对路径
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    $content('img').each((_, img) => {
      const $img = $content(img);
      let src = $img.attr('src') || $img.attr('data-src') || '';
      
      if (src && !src.startsWith('http://') && !src.startsWith('https://')) {
        if (src.startsWith('//')) {
          src = `${parsedUrl.protocol}${src}`;
        } else if (src.startsWith('/')) {
          src = `${baseUrl}${src}`;
        } else {
          src = `${baseUrl}/${src}`;
        }
        $img.attr('src', src);
      }
    });

    // 将HTML转换为Markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    // 配置图片转换规则，保留图片
    turndownService.addRule('images', {
      filter: 'img',
      replacement: (content, node: any) => {
        const src = node.getAttribute('src') || '';
        const alt = node.getAttribute('alt') || '图片';
        if (src) {
          return `![${alt}](${src})`;
        }
        return '';
      },
    });

    const markdown = turndownService.turndown($content.html() || '');

    res.json({
      title: title || '未命名文章',
      content: markdown,
    });
  } catch (error: any) {
    console.error('Fetch article from URL error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch article from URL' 
    });
  }
}
