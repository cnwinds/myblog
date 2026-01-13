import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ArticleModel } from '../models/Article';

export function getArticles(req: AuthRequest, res: Response) {
  try {
    const articles = ArticleModel.findAll();
    res.json(articles);
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function getArticle(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const article = ArticleModel.findById(id);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function createArticle(req: AuthRequest, res: Response) {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const article = ArticleModel.create({
      title,
      content,
      authorId: req.userId,
    });

    res.status(201).json(article);
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function updateArticle(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { title, content } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const article = ArticleModel.update(id, { title, content }, req.userId);

    if (!article) {
      return res.status(404).json({ error: 'Article not found or unauthorized' });
    }

    res.json(article);
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

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
