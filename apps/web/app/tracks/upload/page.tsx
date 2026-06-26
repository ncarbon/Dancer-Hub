import UploadForm from '@/components/UploadForm';

export default function UploadPage() {
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-8">Upload a Track</h1>
      <UploadForm />
    </div>
  );
}
