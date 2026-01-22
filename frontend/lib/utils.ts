export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function parseCSV(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const emails: string[] = [];
      
      // Simple CSV/line-by-line parsing
      const lines = text.split('\n');
      for (const line of lines) {
        // Handle CSV format (comma-separated)
        const parts = line.split(',').map(p => p.trim());
        for (const part of parts) {
          // Basic email validation
          if (part.includes('@') && part.includes('.')) {
            emails.push(part);
          }
        }
      }
      
      // Remove duplicates
      const uniqueEmails = [...new Set(emails)];
      resolve(uniqueEmails);
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
