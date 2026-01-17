import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ArticleModel } from '../models/Article';

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
