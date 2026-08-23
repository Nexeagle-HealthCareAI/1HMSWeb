import React, { useState, useEffect } from 'react';
import { PathologyOrderLineDto, pathologyService } from '../services/pathologyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface OrderResultEntryProps {
  orderId: string;
  orderLine: PathologyOrderLineDto;
  onSuccess: () => void;
}

interface TestParam {
  name: string;
  unit: string;
  min?: number;
  max?: number;
}

export const OrderResultEntry: React.FC<OrderResultEntryProps> = ({ orderId, orderLine, onSuccess }) => {
  const [params, setParams] = useState<TestParam[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [interpretation, setInterpretation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      if (orderLine.parameterSchemaJson) {
        const schema = JSON.parse(orderLine.parameterSchemaJson);
        if (schema && Array.isArray(schema.params)) {
          setParams(schema.params);
        }
      } else {
          setParams([]);
      }

      if (orderLine.result?.resultValuesJson) {
        const savedValues = JSON.parse(orderLine.result.resultValuesJson);
        setValues(savedValues || {});
      } else {
        setValues({});
      }

      setInterpretation(orderLine.result?.interpretation || '');
    } catch (e) {
      console.error("Failed to parse schema or values", e);
    }
  }, [orderLine]);

  const handleValueChange = (paramName: string, value: string) => {
    setValues(prev => ({ ...prev, [paramName]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await pathologyService.enterResult(orderId, orderLine.orderLineId, {
        resultValuesJson: JSON.stringify(values),
        interpretation
      });
      toast.success("Success", {
        description: "Results saved successfully.",
      });
      onSuccess();
    } catch (error) {
      toast.error("Error", {
        description: "Failed to save results.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = orderLine.status === 'REPORT_APPROVED';

  return (
    <Card className="mt-4">
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-lg">{orderLine.testName} ({orderLine.testCode})</CardTitle>
        <CardDescription>Status: {orderLine.status.replace('_', ' ')}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {params.length > 0 ? (
          params.map((param, index) => (
            <div key={index} className="grid grid-cols-4 items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
              <Label className="col-span-1 font-medium">{param.name}</Label>
              <div className="col-span-2 flex items-center space-x-2">
                <Input
                  value={values[param.name] || ''}
                  onChange={(e) => handleValueChange(param.name, e.target.value)}
                  placeholder="Enter value"
                  disabled={isCompleted}
                />
                <span className="text-sm text-muted-foreground w-16">{param.unit}</span>
              </div>
              <div className="col-span-1 text-xs text-muted-foreground">
                {param.min !== undefined && param.max !== undefined ? (
                  <span>Normal: {param.min} - {param.max}</span>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground italic">
            No parameter schema defined for this test.
          </div>
        )}

        <div className="pt-4 space-y-2">
          <Label>Interpretation / Notes</Label>
          <Textarea 
            value={interpretation}
            onChange={(e) => setInterpretation(e.target.value)}
            placeholder="Add any specific observations..."
            disabled={isCompleted}
          />
        </div>

        {!isCompleted && (
          <div className="flex justify-end pt-4">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Result'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
