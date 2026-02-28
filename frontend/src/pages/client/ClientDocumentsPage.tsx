import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ClientLayout from '@/components/layouts/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getMyDocuments } from '@/db/api';
import { Document } from '@/types';
import { FileText, Download, Search, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ClientDocumentsPage() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchDocs() {
      if (!profile) return;
      try {
        const docs = await getMyDocuments(profile);
        setDocuments(docs);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, [profile]);

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Documents</h1>
            <p className="text-muted-foreground mt-2">Access and download documents shared with your company.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documents..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <Card key={doc.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base truncate" title={doc.title}>
                      {doc.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium uppercase">{doc.file_type || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span className="font-medium">{formatFileSize(doc.file_size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shared on:</span>
                      <span className="font-medium">{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4" 
                    asChild
                  >
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-20 bg-muted/20 rounded-lg border-2 border-dashed">
              <FileDown className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground">No documents found.</p>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
