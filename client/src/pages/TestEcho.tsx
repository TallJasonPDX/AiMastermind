import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function TestEcho() {
  const [testData, setTestData] = useState('{"test": "data"}');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendTestRequest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      console.log('Sending test data:', testData);
      const parsedData = JSON.parse(testData);
      const result = await apiRequest('POST', '/test-echo', parsedData);
      console.log('Received response:', result);
      setResponse(result);
    } catch (err) {
      console.error('Error sending test request:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [testData]);

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Test API Echo</CardTitle>
          <CardDescription>This utility helps test the Echo API endpoint</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Test JSON Data
            </label>
            <Textarea 
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              placeholder='{"test": "value"}'
              rows={5}
              className="font-mono"
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {response && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Response:</h3>
              <pre className="bg-muted p-4 rounded overflow-x-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={sendTestRequest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Send Test Request'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}