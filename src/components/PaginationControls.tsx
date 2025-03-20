import React from 'react';

export type Pagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

interface PaginationControlsProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ 
  pagination, 
  onPageChange 
}) => {
  const { page, pages } = pagination;
  
  // Calculate which page numbers to show
  const getPageNumbers = () => {
    const pageNumbers = [];
    
    if (pages <= 7) {
      // If we have 7 or fewer pages, show all of them
      for (let i = 1; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always include first page
      pageNumbers.push(1);
      
      if (page > 3) {
        // Show ellipsis after first page if current page is not near the beginning
        pageNumbers.push('ellipsis');
      }
      
      // Show current page and surrounding pages
      const startPage = Math.max(2, page - 1);
      const endPage = Math.min(pages - 1, page + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      if (page < pages - 2) {
        // Show ellipsis before last page if current page is not near the end
        pageNumbers.push('ellipsis');
      }
      
      // Always include last page
      pageNumbers.push(pages);
    }
    
    return pageNumbers;
  };
  
  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{pagination.total > 0 ? ((page - 1) * pagination.limit) + 1 : 0}</span> to{' '}
            <span className="font-medium">
              {Math.min(page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-medium">{pagination.total}</span> results
          </p>
        </div>
        
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => page > 1 && onPageChange(page - 1)}
              disabled={page <= 1}
              className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 
                ${page > 1 ? 'hover:bg-gray-50 focus:z-20 focus:outline-offset-0' : 'cursor-not-allowed'}`}
            >
              <span className="sr-only">Previous</span>
              Previous
            </button>
            
            {getPageNumbers().map((pageNumber, index) => (
              <React.Fragment key={`page-${pageNumber}-${index}`}>
                {pageNumber === 'ellipsis' ? (
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                    ...
                  </span>
                ) : (
                  <button
                    onClick={() => typeof pageNumber === 'number' && onPageChange(pageNumber)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold 
                      ${page === pageNumber 
                        ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' 
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                  >
                    {pageNumber}
                  </button>
                )}
              </React.Fragment>
            ))}
            
            <button
              onClick={() => page < pages && onPageChange(page + 1)}
              disabled={page >= pages}
              className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 
                ${page < pages ? 'hover:bg-gray-50 focus:z-20 focus:outline-offset-0' : 'cursor-not-allowed'}`}
            >
              <span className="sr-only">Next</span>
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default PaginationControls; 