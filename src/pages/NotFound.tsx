import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="container-narrow">
      <div className="card p-4 text-center my-8">
        <h1 className="text-2xl font-bold mb-4">404 - Trang không tồn tại</h1>
        <p className="mb-6">
          Rất tiếc, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <div className="flex justify-center">
          <Link to="/" className="btn btn-primary">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 