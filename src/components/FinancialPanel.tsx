import React, { useState } from 'react';
import { DollarSign, CreditCard, Shield, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const FinancialPanel: React.FC = () => {
  const { finances, cash, totalRevenue, totalCosts, reputation, formatCurrency, takeLoan } = useGameStore();
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanAmount, setLoanAmount] = useState(1000000);
  const [loanTerm, setLoanTerm] = useState(365);

  const profit = totalRevenue - totalCosts;
  const totalLoanDebt = finances.loans.reduce((sum, loan) => sum + loan.remainingAmount, 0);
  const monthlyLoanPayments = finances.loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);

  const handleTakeLoan = () => {
    takeLoan(loanAmount, loanTerm);
    setShowLoanModal(false);
  };

  const getCreditRatingColor = (rating: number) => {
    if (rating >= 80) return 'text-green-600 bg-green-100';
    if (rating >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="text-green-600" size={24} />
          <h2 className="text-2xl font-bold text-slate-800">財務状況</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-green-600" size={20} />
              <span className="text-green-700 font-medium">現金</span>
            </div>
            <div className="text-2xl font-bold text-green-800">
              {formatCurrency(cash)}
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-blue-600" size={20} />
              <span className="text-blue-700 font-medium">純利益</span>
            </div>
            <div className={`text-2xl font-bold ${profit >= 0 ? 'text-blue-800' : 'text-red-600'}`}>
              {formatCurrency(profit)}
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="text-red-600" size={20} />
              <span className="text-red-700 font-medium">借入残高</span>
            </div>
            <div className="text-2xl font-bold text-red-800">
              {formatCurrency(totalLoanDebt)}
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="text-purple-600" size={20} />
              <span className="text-purple-700 font-medium">信用格付</span>
            </div>
            <div className={`text-2xl font-bold px-2 py-1 rounded ${getCreditRatingColor(finances.creditRating)}`}>
              {finances.creditRating}/100
            </div>
          </div>
        </div>
      </div>

      {/* Loans Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="text-red-600" size={20} />
            融資管理
          </h3>
          <button
            onClick={() => setShowLoanModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            融資申請
          </button>
        </div>

        {finances.loans.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
            <p>現在、借入はありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">月次返済額:</span>
                  <div className="font-bold text-red-600">{formatCurrency(monthlyLoanPayments)}</div>
                </div>
                <div>
                  <span className="text-slate-600">総借入残高:</span>
                  <div className="font-bold text-red-600">{formatCurrency(totalLoanDebt)}</div>
                </div>
              </div>
            </div>

            {finances.loans.map(loan => {
              const remainingMonths = Math.ceil(loan.remainingAmount / loan.monthlyPayment);
              const progressPercentage = ((loan.amount - loan.remainingAmount) / loan.amount) * 100;

              return (
                <div key={loan.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-slate-800">
                        融資 #{loan.id.slice(0, 8)}
                      </h4>
                      <p className="text-sm text-slate-600">
                        金利 {(loan.interestRate * 100).toFixed(1)}% • 残り{remainingMonths}ヶ月
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800">
                        {formatCurrency(loan.remainingAmount)}
                      </div>
                      <div className="text-sm text-slate-500">
                        / {formatCurrency(loan.amount)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">返済進捗</span>
                      <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Loan Application Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">融資申請</h3>
              <button
                onClick={() => setShowLoanModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  融資額
                </label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  min="100000"
                  max="50000000"
                  step="100000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-slate-500 mt-1">
                  {formatCurrency(loanAmount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  返済期間 (日)
                </label>
                <select
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={365}>1年 (365日)</option>
                  <option value={730}>2年 (730日)</option>
                  <option value={1095}>3年 (1095日)</option>
                  <option value={1825}>5年 (1825日)</option>
                </select>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-2">融資条件</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>金利:</span>
                    <span>{((0.05 + (100 - finances.creditRating) * 0.001) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>月次返済額:</span>
                    <span>{formatCurrency((loanAmount * (0.05 + (100 - finances.creditRating) * 0.001)) / 12)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>総返済額:</span>
                    <span>{formatCurrency(loanAmount * (1 + (0.05 + (100 - finances.creditRating) * 0.001)))}</span>
                  </div>
                </div>
              </div>

              {finances.creditRating < 50 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-red-600" size={16} />
                    <span className="text-red-800 text-sm font-medium">
                      信用格付が低いため、高金利が適用されます
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLoanModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleTakeLoan}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                融資を受ける
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};