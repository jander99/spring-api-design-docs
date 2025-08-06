#!/usr/bin/env node

/**
 * Reading Level Analyzer for API Documentation
 * 
 * Analyzes markdown documentation for:
 * - Reading time estimation
 * - Reading level complexity 
 * - Technical density
 * - Accessibility for junior engineers
 */

const fs = require('fs');
const path = require('path');

class ReadingLevelAnalyzer {
  constructor() {
    // Reading speeds (words per minute)
    this.READING_SPEEDS = {
      text: 250,           // Normal technical text
      code: 100,           // Code examples (slower)
      json: 180,           // JSON/YAML (easier to scan)
      lists: 300,          // Bullet points (faster)
      headers: 400         // Headings (very fast)
    };

    // Technical terms that indicate complexity
    this.TECHNICAL_TERMS = [
      'oauth', 'jwt', 'cors', 'hateoas', 'crud', 'rest', 'api', 'http', 'json',
      'microservice', 'endpoint', 'middleware', 'authentication', 'authorization',
      'pagination', 'idempotent', 'webhook', 'async', 'reactive', 'streaming',
      'schema', 'openapi', 'rfc', 'ssl', 'tls', 'cdn', 'load balancer',
      'circuit breaker', 'retry', 'backoff', 'timeout', 'cache', 'redis',
      'database', 'transaction', 'acid', 'nosql', 'sql', 'index', 'query'
    ];
  }

  /**
   * Analyze a markdown file for reading level and time
   */
  analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath);
    
    // Parse different content types
    const contentBreakdown = this.parseContent(content);
    
    // Calculate reading time
    const readingTime = this.calculateReadingTime(contentBreakdown);
    
    // Calculate complexity metrics
    const complexity = this.calculateComplexity(contentBreakdown);
    
    // Determine reading level
    const readingLevel = this.determineReadingLevel(complexity);
    
    return {
      filename,
      filePath,
      readingTime,
      complexity,
      readingLevel,
      contentBreakdown,
      infoBox: this.generateInfoBox(filename, readingTime, readingLevel, complexity)
    };
  }

  /**
   * Parse markdown content into different types
   */
  parseContent(content) {
    const lines = content.split('\n');
    const breakdown = {
      text: [],
      codeBlocks: [],
      jsonBlocks: [],
      headers: [],
      lists: [],
      tables: []
    };

    let currentCodeBlock = null;
    let inCodeBlock = false;

    for (const line of lines) {
      // Code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock && currentCodeBlock) {
          breakdown.codeBlocks.push({
            language: currentCodeBlock.language,
            content: currentCodeBlock.content,
            wordCount: this.countWords(currentCodeBlock.content)
          });
          currentCodeBlock = null;
        } else {
          const language = line.trim().substring(3).toLowerCase();
          currentCodeBlock = { language, content: '' };
        }
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (inCodeBlock && currentCodeBlock) {
        currentCodeBlock.content += line + '\n';
        continue;
      }

      // Headers
      if (line.trim().startsWith('#')) {
        breakdown.headers.push(line.trim());
        continue;
      }

      // Lists
      if (line.trim().match(/^[-*+]\s/) || line.trim().match(/^\d+\.\s/)) {
        breakdown.lists.push(line.trim());
        continue;
      }

      // Tables
      if (line.includes('|')) {
        breakdown.tables.push(line.trim());
        continue;
      }

      // Regular text
      if (line.trim().length > 0) {
        breakdown.text.push(line.trim());
      }
    }

    return breakdown;
  }

  /**
   * Calculate estimated reading time
   */
  calculateReadingTime(breakdown) {
    let totalMinutes = 0;

    // Text content
    const textWords = this.countWords(breakdown.text.join(' '));
    totalMinutes += textWords / this.READING_SPEEDS.text;

    // Code blocks (categorize by type)
    for (const block of breakdown.codeBlocks) {
      const speed = ['json', 'yaml', 'yml'].includes(block.language) 
        ? this.READING_SPEEDS.json 
        : this.READING_SPEEDS.code;
      totalMinutes += block.wordCount / speed;
    }

    // Lists and headers
    const listWords = this.countWords(breakdown.lists.join(' '));
    totalMinutes += listWords / this.READING_SPEEDS.lists;

    const headerWords = this.countWords(breakdown.headers.join(' '));
    totalMinutes += headerWords / this.READING_SPEEDS.headers;

    // Tables (average of text and list speed)
    const tableWords = this.countWords(breakdown.tables.join(' '));
    totalMinutes += tableWords / ((this.READING_SPEEDS.text + this.READING_SPEEDS.lists) / 2);

    return {
      totalMinutes: Math.ceil(totalMinutes),
      breakdown: {
        text: Math.ceil(textWords / this.READING_SPEEDS.text),
        code: Math.ceil(breakdown.codeBlocks.reduce((sum, block) => sum + block.wordCount, 0) / this.READING_SPEEDS.code),
        other: Math.ceil((listWords + headerWords + tableWords) / this.READING_SPEEDS.lists)
      }
    };
  }

  /**
   * Calculate complexity metrics
   */
  calculateComplexity(breakdown) {
    const allText = [
      ...breakdown.text,
      ...breakdown.lists,
      ...breakdown.headers
    ].join(' ').toLowerCase();

    const totalWords = this.countWords(allText);
    const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Technical density
    const technicalTerms = this.TECHNICAL_TERMS.filter(term => 
      allText.includes(term.toLowerCase())
    );
    const technicalDensity = (technicalTerms.length / totalWords) * 100;

    // Sentence complexity
    const avgWordsPerSentence = totalWords / sentences.length;
    
    // Readability scores
    const fleschScore = this.calculateFleschScore(allText, totalWords, sentences.length);
    const gradeLevel = this.calculateGradeLevel(allText, totalWords, sentences.length);

    // Code complexity
    const codeBlocks = breakdown.codeBlocks.length;
    const hasComplexCode = breakdown.codeBlocks.some(block => 
      !['json', 'yaml', 'yml', 'http'].includes(block.language)
    );

    return {
      totalWords,
      sentences: sentences.length,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      technicalDensity: Math.round(technicalDensity * 10) / 10,
      technicalTerms: technicalTerms.length,
      uniqueTechnicalTerms: technicalTerms,
      fleschScore: Math.round(fleschScore * 10) / 10,
      gradeLevel: Math.round(gradeLevel * 10) / 10,
      codeBlocks,
      hasComplexCode
    };
  }

  /**
   * Calculate Flesch Reading Ease Score
   */
  calculateFleschScore(text, totalWords, totalSentences) {
    const syllables = this.countSyllables(text);
    return 206.835 - (1.015 * (totalWords / totalSentences)) - (84.6 * (syllables / totalWords));
  }

  /**
   * Calculate Flesch-Kincaid Grade Level
   */
  calculateGradeLevel(text, totalWords, totalSentences) {
    const syllables = this.countSyllables(text);
    return (0.39 * (totalWords / totalSentences)) + (11.8 * (syllables / totalWords)) - 15.59;
  }

  /**
   * Count syllables in text (simplified)
   */
  countSyllables(text) {
    // Simple syllable counting algorithm
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    return words.reduce((count, word) => {
      // Basic syllable counting rules
      let syllables = word.match(/[aeiouy]+/g) || [];
      if (word.endsWith('e')) syllables.pop();
      return count + Math.max(1, syllables.length);
    }, 0);
  }

  /**
   * Count words in text
   */
  countWords(text) {
    return (text.match(/\b\w+\b/g) || []).length;
  }

  /**
   * Determine overall reading level
   */
  determineReadingLevel(complexity) {
    let level = 'Intermediate';
    let reasoning = [];

    // Grade level assessment
    if (complexity.gradeLevel <= 12) {
      level = 'Beginner';
      reasoning.push('accessible language');
    } else if (complexity.gradeLevel <= 16) {
      level = 'Intermediate';
      reasoning.push('moderate complexity');
    } else {
      level = 'Advanced';
      reasoning.push('complex language');
    }

    // Technical density assessment
    if (complexity.technicalDensity > 20) {
      level = this.escalateLevel(level);
      reasoning.push('high technical density');
    } else if (complexity.technicalDensity < 10) {
      reasoning.push('low technical density');
    }

    // Code complexity
    if (complexity.hasComplexCode) {
      level = this.escalateLevel(level);
      reasoning.push('complex code examples');
    }

    // Sentence complexity
    if (complexity.avgWordsPerSentence > 20) {
      level = this.escalateLevel(level);
      reasoning.push('long sentences');
    }

    return {
      level,
      reasoning,
      fleschInterpretation: this.interpretFleschScore(complexity.fleschScore)
    };
  }

  /**
   * Escalate reading level (Beginner → Intermediate → Advanced)
   */
  escalateLevel(currentLevel) {
    const levels = ['Beginner', 'Intermediate', 'Advanced'];
    const currentIndex = levels.indexOf(currentLevel);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  /**
   * Interpret Flesch Reading Ease Score
   */
  interpretFleschScore(score) {
    if (score >= 70) return 'Very Easy';
    if (score >= 60) return 'Easy';
    if (score >= 50) return 'Fairly Easy';
    if (score >= 30) return 'Fairly Difficult';
    if (score >= 10) return 'Difficult';
    return 'Very Difficult';
  }

  /**
   * Generate reading time and complexity info box
   */
  generateInfoBox(filename, readingTime, readingLevel, complexity) {
    const minutes = readingTime.totalMinutes;
    const timeText = minutes === 1 ? '1 minute' : `${minutes} minutes`;
    
    const levelEmoji = {
      'Beginner': '🟢',
      'Intermediate': '🟡', 
      'Advanced': '🔴'
    };

    const prerequisites = this.suggestPrerequisites(readingLevel.level, complexity);
    const keyTopics = this.extractKeyTopics(complexity.uniqueTechnicalTerms);

    return `> **📖 Reading Guide**
> 
> **⏱️ Reading Time:** ${timeText} | **${levelEmoji[readingLevel.level]} Level:** ${readingLevel.level}
> 
> **📋 Prerequisites:** ${prerequisites}  
> **🎯 Key Topics:** ${keyTopics}
> 
> **📊 Complexity:** ${complexity.gradeLevel.toFixed(1)} grade level • ${complexity.technicalDensity.toFixed(1)}% technical density • ${readingLevel.fleschInterpretation.toLowerCase()}`;
  }

  /**
   * Suggest prerequisites based on complexity
   */
  suggestPrerequisites(level, complexity) {
    const hasAdvancedConcepts = complexity.uniqueTechnicalTerms.some(term => 
      ['hateoas', 'oauth', 'jwt', 'circuit breaker', 'reactive'].includes(term)
    );

    if (level === 'Beginner') {
      return 'Basic HTTP knowledge';
    } else if (level === 'Intermediate') {
      return hasAdvancedConcepts 
        ? 'HTTP fundamentals, basic API experience'
        : 'Basic REST API knowledge';
    } else {
      return 'Strong API background, experience with complex systems';
    }
  }

  /**
   * Extract key topics from technical terms
   */
  extractKeyTopics(technicalTerms) {
    const topicMapping = {
      'oauth': 'Authentication',
      'jwt': 'Authentication', 
      'cors': 'Security',
      'hateoas': 'REST',
      'pagination': 'Data',
      'reactive': 'Architecture',
      'streaming': 'Architecture',
      'microservice': 'Architecture',
      'openapi': 'Documentation',
      'testing': 'Quality',
      'monitoring': 'Observability'
    };

    const topics = new Set();
    for (const term of technicalTerms) {
      if (topicMapping[term]) {
        topics.add(topicMapping[term]);
      }
    }

    return topics.size > 0 
      ? Array.from(topics).slice(0, 3).join(', ')
      : 'API Design';
  }

  /**
   * Provide improvement suggestions
   */
  suggestImprovements(complexity, readingLevel) {
    const suggestions = [];

    if (complexity.gradeLevel > 16) {
      suggestions.push('Consider breaking long sentences into shorter ones');
    }

    if (complexity.avgWordsPerSentence > 20) {
      suggestions.push('Average sentence length is high - consider shorter sentences');
    }

    if (complexity.technicalDensity > 25) {
      suggestions.push('High technical density - consider adding explanations for technical terms');
    }

    if (complexity.fleschScore < 30) {
      suggestions.push('Text is difficult to read - consider simplifying language');
    }

    if (readingLevel.level === 'Advanced' && complexity.codeBlocks > 10) {
      suggestions.push('Many code examples - consider consolidating or moving to appendix');
    }

    return suggestions;
  }

  /**
   * Analyze entire directory
   */
  analyzeDirectory(dirPath) {
    const results = [];
    
    const analyzeRecursive = (currentPath) => {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          analyzeRecursive(itemPath);
        } else if (item.endsWith('.md') && !item.startsWith('.')) {
          try {
            const analysis = this.analyzeFile(itemPath);
            results.push(analysis);
          } catch (error) {
            console.warn(`Error analyzing ${itemPath}: ${error.message}`);
          }
        }
      }
    };

    analyzeRecursive(dirPath);
    return results;
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(analyses) {
    const total = analyses.length;
    const byLevel = analyses.reduce((acc, analysis) => {
      acc[analysis.readingLevel.level] = (acc[analysis.readingLevel.level] || 0) + 1;
      return acc;
    }, {});

    const avgReadingTime = analyses.reduce((sum, a) => sum + a.readingTime.totalMinutes, 0) / total;
    const avgGradeLevel = analyses.reduce((sum, a) => sum + a.complexity.gradeLevel, 0) / total;
    const avgTechnicalDensity = analyses.reduce((sum, a) => sum + a.complexity.technicalDensity, 0) / total;

    const mostComplex = analyses
      .sort((a, b) => b.complexity.gradeLevel - a.complexity.gradeLevel)
      .slice(0, 5);

    const longestReads = analyses
      .sort((a, b) => b.readingTime.totalMinutes - a.readingTime.totalMinutes)
      .slice(0, 5);

    return {
      totalDocuments: total,
      distributionByLevel: byLevel,
      averages: {
        readingTime: Math.round(avgReadingTime * 10) / 10,
        gradeLevel: Math.round(avgGradeLevel * 10) / 10,
        technicalDensity: Math.round(avgTechnicalDensity * 10) / 10
      },
      mostComplex: mostComplex.map(a => ({
        file: a.filename,
        gradeLevel: a.complexity.gradeLevel,
        level: a.readingLevel.level
      })),
      longestReads: longestReads.map(a => ({
        file: a.filename,
        minutes: a.readingTime.totalMinutes,
        level: a.readingLevel.level
      }))
    };
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new ReadingLevelAnalyzer();
  
  const command = process.argv[2];
  const target = process.argv[3] || '.';

  if (command === 'file') {
    // Analyze single file
    const analysis = analyzer.analyzeFile(target);
    console.log('\n=== Reading Level Analysis ===\n');
    console.log(analysis.infoBox);
    console.log('\n=== Detailed Metrics ===');
    console.log(`Grade Level: ${analysis.complexity.gradeLevel}`);
    console.log(`Flesch Score: ${analysis.complexity.fleschScore} (${analysis.readingLevel.fleschInterpretation})`);
    console.log(`Technical Density: ${analysis.complexity.technicalDensity}%`);
    console.log(`Total Words: ${analysis.complexity.totalWords}`);
    console.log(`Code Blocks: ${analysis.complexity.codeBlocks}`);
    
    const suggestions = analyzer.suggestImprovements(analysis.complexity, analysis.readingLevel);
    if (suggestions.length > 0) {
      console.log('\n=== Improvement Suggestions ===');
      suggestions.forEach(suggestion => console.log(`• ${suggestion}`));
    }

  } else if (command === 'directory') {
    // Analyze directory
    const analyses = analyzer.analyzeDirectory(target);
    const summary = analyzer.generateSummaryReport(analyses);
    
    console.log('\n=== Directory Reading Level Summary ===\n');
    console.log(`Total Documents: ${summary.totalDocuments}`);
    console.log(`Average Reading Time: ${summary.averages.readingTime} minutes`);
    console.log(`Average Grade Level: ${summary.averages.gradeLevel}`);
    console.log(`Average Technical Density: ${summary.averages.technicalDensity}%`);
    
    console.log('\n=== Distribution by Level ===');
    Object.entries(summary.distributionByLevel).forEach(([level, count]) => {
      const percentage = ((count / summary.totalDocuments) * 100).toFixed(1);
      console.log(`${level}: ${count} documents (${percentage}%)`);
    });

    console.log('\n=== Most Complex Documents ===');
    summary.mostComplex.forEach((doc, i) => {
      console.log(`${i + 1}. ${doc.file} - Grade ${doc.gradeLevel.toFixed(1)} (${doc.level})`);
    });

    console.log('\n=== Longest Reading Times ===');
    summary.longestReads.forEach((doc, i) => {
      console.log(`${i + 1}. ${doc.file} - ${doc.minutes} minutes (${doc.level})`);
    });

  } else if (command === 'infobox') {
    // Generate info box for a file
    const analysis = analyzer.analyzeFile(target);
    console.log(analysis.infoBox);

  } else {
    // Show usage
    console.log('Usage:');
    console.log('  node reading-level-analyzer.js file <path>      - Analyze single file');
    console.log('  node reading-level-analyzer.js directory <path> - Analyze directory');
    console.log('  node reading-level-analyzer.js infobox <path>   - Generate info box only');
    console.log('\nExamples:');
    console.log('  node reading-level-analyzer.js file api-design/foundations/README.md');
    console.log('  node reading-level-analyzer.js directory api-design/');
    console.log('  node reading-level-analyzer.js infobox api-design/maturity-model/README.md');
  }
}

module.exports = ReadingLevelAnalyzer;